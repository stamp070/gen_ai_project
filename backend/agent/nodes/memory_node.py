from agent.state import AgentState
from memory.store import get_memory_summary

""""

On Real Production 
this node need to have trend prediction (by rule based or ML)
to calling next reason node (โดยไม่สนใจ cronjob)

"""

def memory_node(state: AgentState) -> AgentState:
    """Node 2: Load historical context for this patient"""
    summary = get_memory_summary(state.patient_id)
    state.memory_context = summary
    state.log(f"[MEMORY] Loaded {summary['previous_loops']} previous loops")

    return state