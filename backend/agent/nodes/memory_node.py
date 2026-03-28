"""
agent/nodes/memory_node.py (v2)
Reads persistent memory from Supabase instead of in-memory dict.
Falls back to in-memory store if Supabase is unavailable.
"""
from agent.state import AgentState


def memory_node(state: AgentState) -> AgentState:
    """Node 2: Load historical context from Supabase (persistent)."""
    summary = None

    # Try Supabase first
    try:
        from db.repositories import get_patient_by_code, get_agent_memory_summary
        patient = get_patient_by_code(state.patient_id)
        if patient:
            summary = get_agent_memory_summary(patient["id"])
    except Exception as e:
        state.log(f"[MEMORY] ⚠️ Supabase unavailable, using in-memory fallback: {e}")

    # Fallback to in-memory store
    if summary is None:
        from memory.store import get_memory_summary
        summary = get_memory_summary(state.patient_id)

    state.memory_context = summary
    prev = summary.get("previous_loops", 0)

    if prev > 0:
        state.log(f"[MEMORY] 🧠 Loaded {prev} previous loops for {state.patient_id}")
        last_goal = summary.get("last_goal")
        last_risk = summary.get("last_risk")
        if last_goal or last_risk:
            state.log(f"[MEMORY] Last state: goal={last_goal}, risk={last_risk}")
    else:
        state.log(f"[MEMORY] No prior history for {state.patient_id} — fresh start")

    return state