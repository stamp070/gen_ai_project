"""
execute.py — Execute plan steps ONE AT A TIME and write real side-effects to DB.
patient_id and run_id are injected into tool params so DB tools can persist properly.
"""
from agent.state import AgentState, PatientStatus
from tools.hospital_tools import execute_tool


def execute_node(state: AgentState) -> AgentState:
    if not state.plan_steps:
        state.log("[EXECUTE] No plan steps to execute")
        return state

    total = len(state.plan_steps)
    run_id = getattr(state, "run_id", None)

    for i, step in enumerate(state.plan_steps):
        if step.status in ("done", "skipped", "failed"):
            continue

        state.log(f"[EXECUTE] ▶ Step {i+1}/{total}: {step.action}({step.params})")

        # Inject patient_id + run_id into tools that accept them
        enriched_params = dict(step.params)
        _PATIENT_TOOLS = {"notify", "adjust_monitoring", "create_task",
                          "update_priority_rank", "set_patient_status",
                          "request_lab", "escalate_to_supervisor", "insert_vitals"}
        if step.action in _PATIENT_TOOLS:
            if "patient_id" not in enriched_params:
                enriched_params["patient_id"] = state.patient_id
            if "run_id" not in enriched_params and run_id:
                enriched_params["run_id"] = str(run_id)

        result = execute_tool(step.action, enriched_params)
        step.status = "done"
        step.result = result

        # Reflect side-effects back into state so reeval sees updated data
        _apply_tool_effects(state, step.action, enriched_params)

        state.log(f"[EXECUTE] ✅ {step.action} → {result}")

    return state


def _apply_tool_effects(state: AgentState, action: str, params: dict):
    if action == "adjust_monitoring":
        state.monitoring_interval_min = params.get("interval_min", state.monitoring_interval_min)

    elif action == "update_priority_rank":
        state.priority_rank = params.get("new_rank", state.priority_rank)

    elif action == "set_patient_status":
        try:
            state.status = PatientStatus(params.get("new_status"))
        except ValueError:
            pass

    elif action == "notify":
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
