"""
reeval.py — Plan Review Gate.
LLM reviews the proposed plan and decides:
  - approved  → proceed to execute
  - rejected  → loop back to reason for re-analysis
"""
import json
from agent.state import AgentState, VitalSigns, RiskLevel
from config import get_llm
from langchain_core.messages import HumanMessage, SystemMessage
from datetime import timedelta
from db.repositories import save_agent_memory, get_patient_by_code
from tools.hospital_tools import insert_vitals


SYSTEM_PROMPT = """
You are a Clinical Plan Reviewer for a hospital ward monitoring system.
Your job is to review the proposed intervention plan and decide if it is appropriate.

CRITICAL CONTEXT - AVAILABLE ACTIONS:
The AI Planner ONLY has access to the following actions:
- notify (Message staff)
- escalate_to_supervisor (Alert the charge nurse/supervisor)
- create_task (Assign a task to ward staff)
- request_lab (Order bloodwork/tests)
- set_patient_status & update_priority_rank (Update DB status)
- adjust_monitoring (Change vital signs check interval)

The AI CANNOT prescribe medication, perform direct medical interventions, or execute physical ICU transfers.

Guidelines for approval:
- APPROVE if the plan reasonably addresses the patient's current risk level using the AVAILABLE tools.
- For CRITICAL/HIGH risk: APPROVE if the plan includes `escalate_to_supervisor`, `notify` (urgent), or `request_lab` (stat/urgent). DO NOT reject simply because the plan lacks physical interventions or ICU transfers, as the AI cannot do those.
- For MODERATE risk: standard monitoring adjustments and notifications are sufficient.
- For LOW risk: basic monitoring is perfectly acceptable.

Only REJECT if:
- The plan clearly misses a critical available action (e.g., failing to `escalate_to_supervisor` for a crashing patient).
- The actions could cause harm.
- The risk level and actions are wildly mismatched.

Output ONLY valid JSON:
{
  "approved": true | false,
  "reason": "Explain clearly why you approve or reject the plan"
}
"""


def reeval_node(state: AgentState) -> AgentState:
    print(f"[REEVAL] 📡 reeval_node CALLED | re_eval_count={state.re_eval_count} | plan_steps={len(state.plan_steps)}")

    # ── 1. Save latest vitals to DB (first loop only) ─────
    latest_vital = state.vitals_history[-5]

    if state.re_eval_count == 0:
        try:
            insert_vitals(state.patient_id, latest_vital.model_dump(mode="json"))
            state.log(f"[REEVAL] 💾 Vitals saved to DB")
        except Exception as e:
            state.log(f"[REEVAL] ⚠️ Vitals DB write failed: {e}")

    # ── 2. Save agent memory snapshot ─────
    try:
        patient = get_patient_by_code(state.patient_id)
        if patient:
            save_agent_memory(
                patient_id_db=patient["id"],
                loop_index=state.re_eval_count,
                state_snapshot={
                    "current_goal": state.current_goal,
                    "risk_level": state.risk_level,
                    "status": state.status,
                    "action_log": state.action_log[-5:],
                    "latest_vitals": latest_vital.model_dump(mode="json"),
                },
            )
    except Exception as e:
        state.log(f"[REEVAL] ⚠️ Memory save failed: {e}")

    # ── 3. LLM reviews the plan ─────
    llm = get_llm()
    context = {
        "vitals_history": [v.model_dump() for v in state.vitals_history],
        "risk_level": state.risk_level,
        "risk_confidence": state.risk_confidence,
        "current_goal": state.current_goal,
        "goal_approved": state.goal_approved,
        "proposed_plan": [
            {"action": s.action, "params": s.params}
            for s in state.plan_steps
        ],
        "patient_status": state.status,
        "patient_diagnosis": getattr(state, "diagnosis", "unknown"),
        "re_eval_count": state.re_eval_count,
    }

    # If this is a retry, include why the previous plan was rejected
    if state.re_eval_count > 0 and state.termination_reason:
        context["previous_rejection_reason"] = state.termination_reason

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"Review this proposed plan:\n{json.dumps(context, default=str, indent=2)}")
    ]

    state.log(f"[REEVAL] 🔍 Asking LLM to review {len(state.plan_steps)} plan steps...")
    response = llm.invoke(messages)
    raw = response.content.strip()

    # Strip markdown code fences if present
    if raw.startswith("```json"):
        raw = raw[7:-3].strip()
    elif raw.startswith("```"):
        raw = raw[3:-3].strip()

    print(f"[REEVAL] 📡 LLM review response: {raw}")

    try:
        data = json.loads(raw)
        approved = data.get("approved", True)
        reason = data.get("reason", "No reason provided")

        if approved:
            # Plan approved → proceed to execute
            state.re_evaluated = False
            state.termination_reason = f"Plan approved: {reason}"
            state.log(f"[REEVAL] ✅ Plan APPROVED → proceeding to Execute | {reason}")
        else:
            # Plan rejected → loop back to reason
            state.re_evaluated = True
            state.termination_reason = f"Plan rejected: {reason}"
            state.log(f"[REEVAL] 🔄 Plan REJECTED → looping back to Reason | {reason}")

    except Exception as e:
        state.log(f"[ERROR] Reeval parsing failed: {e} | raw: {raw}")
        # If parsing fails, default to approve so we don't get stuck
        state.re_evaluated = False
        state.termination_reason = f"Parse error (defaulting to approve): {e}"

    state.re_eval_count += 1
    state.log(f"[REEVAL] Loop #{state.re_eval_count} | approved={not state.re_evaluated} | {state.termination_reason}")
    return state