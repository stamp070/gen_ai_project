"""
agent/nodes/reeval.py (v2)
• Saves memory to Supabase (not in-memory dict)
• Simulates new vitals reading on each re-eval so the loop has real new data
• LLM decides whether the loop should continue
"""
import json
import random
from agent.state import AgentState, VitalSigns
from config import get_llm
from langchain_core.messages import HumanMessage, SystemMessage
from datetime import datetime, timedelta

SYSTEM_PROMPT = """
You are a Clinical Loop Controller for a hospital ward monitoring system.
Your task is to determine if the current monitoring cycle has reached a safe conclusion
or if further immediate action is required.

Input:
1. Latest patient vitals (including any NEW readings from this cycle)
2. Goal set in this cycle
3. Actions actually executed

Evaluation Logic:
- Set 're_evaluated' to false if actions are sufficient for current risk OR situation is stable.
- Set 're_evaluated' to true ONLY if there is a critical unresolved issue or new emergency.

Output ONLY valid JSON:
{
  "re_evaluated": false,
  "termination_reason": "State clearly why we stop or continue"
}
"""

def _simulate_new_vitals(state: AgentState) -> VitalSigns:
    """
    Simulate one new vitals reading based on current trend.
    In production: fetch from HIS/real sensor feed.
    
    Logic:
    - CRITICAL: vitals may improve slightly (response to intervention) or worsen
    - HIGH: slight improvement expected after intervention
    - Others: drift toward normal
    """
    from agent.state import RiskLevel
    latest = state.vitals_history[-1]

    if state.risk_level == RiskLevel.CRITICAL:
        # After intervention, could go either way — small random change
        delta_hr = random.uniform(-8, 5)
        delta_bp_sys = random.uniform(-5, 8)
        delta_spo2 = random.uniform(-0.5, 1.5)
    elif state.risk_level == RiskLevel.HIGH:
        # Intervention likely helping — drift toward normal
        delta_hr = random.uniform(-10, 2)
        delta_bp_sys = random.uniform(2, 10)
        delta_spo2 = random.uniform(0, 1.5)
    else:
        # Stable drift
        delta_hr = random.uniform(-3, 3)
        delta_bp_sys = random.uniform(-3, 3)
        delta_spo2 = random.uniform(-0.2, 0.5)

    new_hr = max(40, min(200, latest.heart_rate + delta_hr))
    new_sys = max(70, min(200, latest.blood_pressure_sys + delta_bp_sys))
    new_dia = max(40, min(120, latest.blood_pressure_dia + random.uniform(-2, 2)))
    new_spo2 = max(85, min(100, latest.spo2 + delta_spo2))

    return VitalSigns(
        heart_rate=round(new_hr, 1),
        blood_pressure_sys=round(new_sys, 1),
        blood_pressure_dia=round(new_dia, 1),
        spo2=round(new_spo2, 2),
        temperature=round(latest.temperature + random.uniform(-0.1, 0.1), 1),
        respiratory_rate=round(latest.respiratory_rate + random.uniform(-1, 1), 1),
        timestamp=latest.timestamp + timedelta(minutes=state.monitoring_interval_min),
    )

def reeval_node(state: AgentState) -> AgentState:
    """
    Node 8: Evaluate whether to continue loop.
    - Adds a new simulated vitals reading
    - Saves memory to Supabase
    - LLM decides re_evaluated
    """
    # ── 1. Simulate new vitals (key improvement) ──────────────────────────────
    new_vitals = _simulate_new_vitals(state)
    state.vitals_history.append(new_vitals)
    state.log(
        f"[REEVAL] 📡 New vitals: HR={new_vitals.heart_rate}, "
        f"BP={new_vitals.blood_pressure_sys}/{new_vitals.blood_pressure_dia}, "
        f"SpO2={new_vitals.spo2}"
    )

    # ── 2. Save memory to Supabase ────────────────────────────────────────────
    try:
        from db.repositories import save_agent_memory, get_patient_by_code
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
                    "latest_vitals": new_vitals.model_dump(mode="json"),
                },
            )
    except Exception as e:
        state.log(f"[REEVAL] ⚠️ Memory save failed: {e}")

    # ── 3. LLM decides whether to continue ───────────────────────────────────
    llm = get_llm()

    context = {
        "vitals_last_3": [v.model_dump() for v in state.vitals_history[-3:]],
        "risk_level": state.risk_level,
        "risk_confidence": state.risk_confidence,
        "current_goal": state.current_goal,
        "goal_approved": state.goal_approved,
        "executed_steps": [
            {"action": s.action, "status": s.status, "result": s.result}
            for s in state.plan_steps
        ],
        "patient_status": state.status,
        "re_eval_count": state.re_eval_count,
        "new_vitals_added": True,
    }

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"Evaluate this cycle:\n{json.dumps(context, default=str, indent=2)}")
    ]

    response = llm.invoke(messages)
    raw = response.content.strip()
    if raw.startswith("```json"):
        raw = raw[7:-3].strip()
    elif raw.startswith("```"):
        raw = raw[3:-3].strip()

    try:
        data = json.loads(raw)
        state.re_evaluated = data.get("re_evaluated", False)
        state.termination_reason = data.get("termination_reason", "Evaluation completed")
    except Exception as e:
        state.log(f"[ERROR] Reeval parsing failed: {e}. Ending loop.")
        state.re_evaluated = False
        state.termination_reason = f"Parse error: {e}"

    state.re_eval_count += 1
    state.log(f"[REEVAL] Continue={state.re_evaluated} | Loop #{state.re_eval_count} | {state.termination_reason}")

    return state