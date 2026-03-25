from langgraph.graph import StateGraph, END
from agent.state import AgentState
from agent.nodes.observe import observe_node
from agent.nodes.memory_node import memory_node
from agent.nodes.reason import reason_node
from agent.nodes.goal import goal_node
from agent.nodes.governance import governance_node
from agent.nodes.plan import plan_node
from agent.nodes.execute import execute_node
from agent.nodes.reeval import reeval_node

def should_reeval(state: AgentState) -> str:
    """Edge condition: loop or end"""
    if state.re_evaluated == False or state.re_eval_count >= 2:
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