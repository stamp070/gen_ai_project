from agent.state import AgentState
from tools.hospital_tools import execute_tool

def execute_node(state: AgentState) -> AgentState:
    """
    Node 7: Execute ALL plan steps
    """
    if not state.plan_steps:
        state.log("[EXECUTE] No plan steps to execute")
        return state

    for i, step in enumerate(state.plan_steps):
        state.log(f"[EXECUTE] Step {i+1}/{len(state.plan_steps)}: {step.action}")
        result = execute_tool(step.action, step.params)
        step.status = "done"
        step.result = result
        _apply_tool_effects(state, step.action, step.params)
        state.log(f"[EXECUTE] ✅ Done: {result}")

    return state

def _apply_tool_effects(state: AgentState, action: str, params: dict):
    """Reflect tool side-effects back into state"""
    from agent.state import PatientStatus

    if action == "adjust_monitoring":
        state.monitoring_interval_min = params.get("interval_min", state.monitoring_interval_min)

    elif action == "update_priority_rank":
        state.priority_rank = params.get("new_rank", state.priority_rank)

    elif action == "set_patient_status":
        try:
            state.status = PatientStatus(params.get("new_status", state.status))
        except ValueError:
            pass