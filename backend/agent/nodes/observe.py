from agent.state import AgentState

def observe_node(state: AgentState) -> AgentState:
    """
    Node 1: Collect current system state
    """
    if isinstance(state, dict):
        state = AgentState(**state)

    state.log(f"[OBSERVE] collecting state")
    latest = state.vitals_history[-1]
    state.log(f"[OBSERVE] Latest Vitals: HR={latest.heart_rate}, BP={latest.blood_pressure_sys}")

    # TODO: validate data from sensor (checking error, missing data, etc.) 
    # TODO: add data from other sources (lab results, medical notes, etc.)

    return state