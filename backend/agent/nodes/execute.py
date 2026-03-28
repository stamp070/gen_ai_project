"""
• Execute steps ONE AT A TIME — not all at once
• After each step, re-observe state changes
• Side-effects are reflected into AgentState immediately
• Tools also persist to Supabase (alerts, tasks)
"""
from agent.state import AgentState, PatientStatus
from tools.hospital_tools import execute_tool


def execute_node(state: AgentState) -> AgentState:
    """
    Node 7: Execute plan steps ONE BY ONE.
    Each step mutates state so re-eval sees updated data.
    """
    if not state.plan_steps:
        state.log("[EXECUTE] No plan steps to execute")
        return state

    total = len(state.plan_steps)
    for i, step in enumerate(state.plan_steps):
        if step.status in ("done", "skipped", "failed"):
            continue  # skip already-processed steps on re-loop

        state.log(f"[EXECUTE] ▶ Step {i+1}/{total}: {step.action}({step.params})")

        # Execute the tool
        result = execute_tool(step.action, step.params)

        # Mark step done
        step.status = "done"
        step.result = result

        # Immediately reflect side-effects into state
        _apply_tool_effects(state, step.action, step.params)

        state.log(f"[EXECUTE] ✅ {step.action} → {result}")

    return state


def _apply_tool_effects(state: AgentState, action: str, params: dict):
    """
    Reflect every tool's side-effect back into state immediately.
    This makes re-eval see the real updated state, not stale data.
    """
    if action == "adjust_monitoring":
        state.monitoring_interval_min = params.get("interval_min", state.monitoring_interval_min)

    elif action == "update_priority_rank":
        state.priority_rank = params.get("new_rank", state.priority_rank)

    elif action == "set_patient_status":
        try:
            state.status = PatientStatus(params.get("new_status"))
            print("Set New Status",state.status)
        except ValueError:
            pass

    elif action == "notify":
        # Log into medical notes so next LLM call sees it
        note = f"[NOTIFIED] {params.get('role','')} — {params.get('message','')} (priority={params.get('priority','normal')})"
        state.medical_notes.append(note)

    elif action == "create_task":
        note = f"[TASK CREATED] {params.get('task_type','')} — {params.get('description','')} (priority={params.get('priority','normal')})"
        state.medical_notes.append(note)

    elif action == "request_lab":
        note = f"[LAB REQUESTED] {params.get('test_name','')} urgency={params.get('urgency','routine')}"
        state.medical_notes.append(note)

    elif action == "escalate_to_supervisor":
        try:
            state.status = PatientStatus.ESCALATED
        except Exception:
            pass
        note = f"[ESCALATED] {params.get('reason','')} severity={params.get('severity','high')}"
        state.medical_notes.append(note)