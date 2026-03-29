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
from tools.hospital_tools import execute_tool


def should_reeval(state: AgentState) -> str:
    max_revals = 5 if state.risk_level in [RiskLevel.CRITICAL, RiskLevel.HIGH] else 2

    # หมด max → force execute (ไม่ปล่อยให้จบโดยไม่ execute)
    if state.re_eval_count >= max_revals:
        if state.risk_level == RiskLevel.CRITICAL:
            state.log(f"[ESCALATION] Max re-evaluations ({max_revals}) reached for CRITICAL case")
            execute_tool("escalate_to_supervisor", {
                "patient_id": state.patient_id,
                "reason": f"Patient {state.patient_id} remains CRITICAL after {max_revals} monitoring cycles.",
                "severity": "critical"
            })
        state.log(f"[REEVAL] Max loops ({max_revals}) reached → forcing execute with current plan")
        return "to_execute"

    if state.re_evaluated:
        return "to_reason"

    return "to_execute"

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
    graph.add_edge("plan",       "reeval")

    # Conditional edges from reeval
    graph.add_conditional_edges(
        "reeval",
        should_reeval,
        {
            "to_reason": "reason",
            "to_execute" : "execute",
            "end":          END,
        }
    )

    graph.add_edge("execute",END)

    return graph.compile()

# Singleton
agent_graph = build_graph()