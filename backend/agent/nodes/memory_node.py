from agent.state import AgentState
from memory.store import get_memory_summary

def memory_node(state: AgentState) -> AgentState:
    """Node 2: Load historical context for this patient"""
    summary = get_memory_summary(state.patient_id)
    state.memory_context = summary
    state.log(f"[MEMORY] Loaded {summary['previous_loops']} previous loops")

    # TODO: checking trend based on history

    return state