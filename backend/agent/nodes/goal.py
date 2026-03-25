from agent.state import AgentState, GoalType

def goal_node(state: AgentState) -> AgentState:
    """
    Node 4: Set/update goal based on reasoning
    LLM suggested a goal in reason_node, we formalize it here
    """
    suggested = getattr(state, "_suggested_goal", None)

    # Map suggested string → GoalType
    try:
        new_goal = GoalType(suggested)
    except (ValueError, TypeError):
        # Fallback: rule-based goal assignment
        from agent.state import RiskLevel
        if state.risk_level == RiskLevel.CRITICAL:
            new_goal = GoalType.PREVENT_DETERIORATION
        elif state.risk_level == RiskLevel.HIGH:
            new_goal = GoalType.INCREASE_CERTAINTY
        elif state.ward and state.ward.workload_score > 0.8:
            new_goal = GoalType.BALANCE_WORKLOAD
        else:
            new_goal = GoalType.MAINTAIN_STABILITY

    # Dynamic goal switching log
    if state.current_goal and state.current_goal != new_goal:
        state.log(f"[GOAL] Switching goal: {state.current_goal} → {new_goal}")
    else:
        state.log(f"[GOAL] Goal set: {new_goal}")

    state.current_goal = new_goal
    state.goal_approved = False  # reset, governance will approve
    return state