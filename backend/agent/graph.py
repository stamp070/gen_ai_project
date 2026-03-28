from langgraph.graph import StateGraph, END
from agent.state import AgentState, RiskLevel
from agent.nodes.observe import observe_node
from agent.nodes.memory_node import memory_node
from agent.nodes.reason import reason_node
from agent.nodes.goal import goal_node
from agent.nodes.governance import governance_node
from agent.nodes.plan import plan_node
from agent.nodes.execute import execute_node
from agent.nodes.reeval import reeval_node

def should_reeval(state: AgentState) -> str:
    """
    Edge condition: loop or end
    Allow more re-evaluations for critical/high-risk cases
    """
    # Determine max re-evaluations based on risk level
    if state.risk_level in [RiskLevel.CRITICAL, RiskLevel.HIGH]:
        max_revals = 5  # Critical/high risk: allow up to 5 attempts
    else:
        max_revals = 2  # Low/moderate: 2 attempts
    
    # Check if we should continue looping
    if not state.re_evaluated or state.re_eval_count >= max_revals:
        # Before ending, escalate if critical after max re-evals
        if state.re_eval_count >= max_revals and state.risk_level == RiskLevel.CRITICAL:
            from tools.hospital_tools import execute_tool
            state.log(f"[ESCALATION] Max re-evaluations ({max_revals}) reached for CRITICAL case")
            execute_tool("escalate_to_supervisor", {
                "patient_id": state.patient_id,
                "reason": f"Patient {state.patient_id} remains CRITICAL after {max_revals} monitoring cycles. Immediate doctor intervention required.",
                "severity": "critical"
            })
        return "end"
    
    return "execute_more" 

def build_graph() -> StateGraph:
    graph = StateGraph(AgentState)

    # Add all nodes
    graph.add_node("observe",    observe_node)
    graph.add_node("memory",     memory_node)
    graph.add_node("reason",     reason_node)
    graph.add_node("goal",       goal_node)
    graph.add_node("governance", governance_node)
    graph.add_node("plan",       plan_node)
    graph.add_node("execute",    execute_node)
    graph.add_node("reeval",     reeval_node)

    # Linear flow
    graph.set_entry_point("observe")
    graph.add_edge("observe",    "memory")
    graph.add_edge("memory",     "reason")
    graph.add_edge("reason",     "goal")
    graph.add_edge("goal",       "governance")
    graph.add_edge("governance", "plan")
    graph.add_edge("plan",       "execute")
    graph.add_edge("execute",    "reeval")

    # Conditional edges from reeval
    graph.add_conditional_edges(
        "reeval",
        should_reeval,
        {
            "execute_more": "reason",   
            "end":          END,
        }
    )

    return graph.compile()

# Singleton
agent_graph = build_graph()