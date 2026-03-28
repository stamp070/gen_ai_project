from agent.state import AgentState
from memory.store import save_loop_memory
from config import get_llm
from langchain_core.messages import HumanMessage, SystemMessage
import json

SYSTEM_PROMPT = """
You are a Clinical Loop Controller for a hospital ward monitoring system.
Your task is to determine if the current monitoring cycle has reached a safe conclusion or if further immediate action is required.

Input to consider:
1. Latest Patient Vitals.
2. The Goal set in this cycle.
3. Actions actually executed by the system.

Evaluation Logic:
- Set 're_evaluated' to false if the actions taken are sufficient for the current risk level OR if the situation is stable.
- Set 're_evaluated' to true ONLY if there is a critical unresolved issue or a new emergency detected during execution.

Output ONLY valid JSON:
{
  "re_evaluated": false,
  "termination_reason": "State clearly why we stop or continue (e.g., 'Vitals stabilized, nurse notified', 'Critical SpO2 drop persists despite O2 adjustment')"
}
"""

def reeval_node(state: AgentState) -> AgentState:
    """
    Node 8: Evaluate whether to continue loop
    Save memory, increment loop counter
    """
    # Save this loop to memory
    save_loop_memory(state.patient_id, {
        "current_goal": state.current_goal,
        "risk_level": state.risk_level,
        "action_log": state.action_log[-5:],
        "status": state.status,
    })

    llm = get_llm()

    reeval_context = {
    "latest_vitals": state.vitals_history[-1].model_dump() if state.vitals_history else {},

    "risk_level": state.risk_level,
    "risk_confidence": state.risk_confidence,

    "current_goal": state.current_goal,
    "goal_approved": state.goal_approved,

    "executed_steps": [
        {"action": s.action, "status": s.status, "result": s.result}
        for s in state.plan_steps
    ],

    "patient_status": state.status,
}

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"Evaluate this cycle:\n{json.dumps(reeval_context, default=str, indent=2)}")
    ]

    response = llm.invoke(messages)
    raw = response.content.strip()
    if raw.startswith("```json"):
        raw = raw[7:-3].strip()
    elif raw.startswith("```"):
        raw = raw[3:-3].strip()
    
    # Parse JSON with error handling
    try:
        data = json.loads(raw)
        state.re_evaluated = data.get("re_evaluated", False)
        state.termination_reason = data.get("termination_reason", "Evaluation completed")
    except (json.JSONDecodeError, ValueError, KeyError) as e:
        state.log(f"[ERROR] LLM reeval parsing failed: {e}. Assuming cycle should end.")
        state.re_evaluated = False
        state.termination_reason = f"LLM parsing error: {str(e)}"
    
    state.re_eval_count += 1

    state.log(f"[REEVAL] Re-evaluated: {state.re_evaluated} | Reason: {state.termination_reason}")

    return state