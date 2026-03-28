from agent.state import AgentState, GoalType

# Hospital policy rules for goal approval
# TODO: In production, load these from a policy database (PolicyDB)
# to allow real-time updates without code redeploy
POLICY = {
    "workload_gated": [GoalType.BALANCE_WORKLOAD],
    "always_allowed": [
        GoalType.MAINTAIN_STABILITY,
        GoalType.INCREASE_CERTAINTY,
        GoalType.REDUCE_FALSE_POSITIVE,
    ],
    "critical_only": [GoalType.PREVENT_DETERIORATION],
}

def governance_node(state: AgentState) -> AgentState:
    """Node 5: Policy + scope check before executing goal"""
    goal = state.current_goal
    reason = ""

    # Check scope
    if goal in POLICY["always_allowed"]:
        state.goal_approved = True

    elif goal in POLICY["critical_only"]:
        from agent.state import RiskLevel
        if state.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
            state.goal_approved = True
        else:
            reason = f"Goal {goal} requires HIGH/CRITICAL risk. Current: {state.risk_level}"

    elif goal in POLICY["workload_gated"]:
        if state.ward and state.ward.workload_score > 0.7:
            state.goal_approved = True
        else:
            reason = f"Goal {goal} requires workload > 0.7. Current: {state.ward.workload_score if state.ward else 'N/A'}"

    else:
        reason = f"Goal {goal} not recognized in policy"

    if state.goal_approved:
        state.log(f"[GOVERNANCE] ✅ Goal APPROVED: {goal}")
    else:
        state.goal_rejection_reason = reason
        state.log(f"[GOVERNANCE] ❌ Goal REJECTED: {reason}")

    return state