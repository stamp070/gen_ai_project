import json
from agent.state import AgentState, PlanStep, GoalType
from config import get_llm
from langchain_core.messages import HumanMessage, SystemMessage

PLAN_SYSTEM = """You are a clinical workflow planner for a hospital AI system.
Given a goal, create a step-by-step execution plan using ONLY available tools.

Available tools:
- notify(role, message, priority)
- adjust_monitoring(patient_id, interval_min)
- create_task(patient_id, task_type, priority, description)
- update_priority_rank(patient_id, new_rank, reason)
- set_patient_status(patient_id, new_status)
- request_lab(patient_id, test_name, urgency)

Output ONLY valid JSON array of steps:
[
  {"step_id": "s1", "action": "tool_name", "params": {...}},
  ...
]
Max 4 steps per plan. No treatment decisions."""

def plan_node(state: AgentState) -> AgentState:
    """Node 6: LLM creates multi-step plan for approved goal"""
    if not state.goal_approved:
        state.log("[PLAN] Skipped — goal not approved")
        return state

    llm = get_llm()

    context = {
        "patient_id": state.patient_id,
        "goal": state.current_goal,
        "risk_level": state.risk_level,
        "current_status": state.status,
        "monitoring_interval": state.monitoring_interval_min,
        "ward_workload": state.ward.workload_score if state.ward else None,
        "reasoning": state.reasoning_summary,
    }

    messages = [
        SystemMessage(content=PLAN_SYSTEM),
        HumanMessage(content=f"Create plan:\n{json.dumps(context, default=str, indent=2)}")
    ]

    response = llm.invoke(messages)
    raw = response.content.strip()
    if raw.startswith("```json"):
        raw = raw[7:-3].strip()
    elif raw.startswith("```"):
        raw = raw[3:-3].strip()
        
    steps_data = json.loads(raw)

    state.plan_steps = [PlanStep(**s) for s in steps_data]
    state.current_step_index = 0
    state.log(f"[PLAN] Created {len(state.plan_steps)}-step plan for goal: {state.current_goal}")
    for i, s in enumerate(state.plan_steps):
        state.log(f"  Step {i+1}: {s.action}({s.params})")

    return state