"""
hospital_tools.py — Agent tools that ACTUALLY write to Supabase
Every tool persists its effect to the DB so the frontend sees real changes.
"""
from datetime import datetime
from db.supabase_client import get_supabase


def _resolve_patient_uuid(patient_id: str) -> str | None:
    """patient_id may be a patient_code like 'P-001' or a UUID. Returns UUID."""
    sb = get_supabase()
    r = sb.table("patients").select("id").eq("patient_code", patient_id).maybe_single().execute()
    if r.data:
        return r.data["id"]
    return patient_id


def notify(role: str, message: str, priority: str = "normal", patient_id: str = None, run_id: str = None) -> str:
    ts = datetime.utcnow().strftime("%H:%M:%S")
    print(f"📢 NOTIFY [{priority.upper()}] → {role}: {message}")
    try:
        sb = get_supabase()
        patient_uuid = _resolve_patient_uuid(patient_id) if patient_id else None
        sb.table("alerts").insert({
            "patient_id": patient_uuid,
            "run_id": run_id,
            "alert_type": "agent_notify",
            "target_role": role,
            "message": message,
            "priority": priority,
            "is_read": False,
        }).execute()
        return f"Alert created for {role} at {ts} [priority={priority}]"
    except Exception as e:
        print(f"  ⚠️  notify DB write failed: {e}")
        return f"Notified {role} at {ts} (DB error: {e})"


def adjust_monitoring(patient_id: str, interval_min: int) -> dict:
    print(f"⏱  MONITORING {patient_id} → every {interval_min} min")
    try:
        sb = get_supabase()
        patient_uuid = _resolve_patient_uuid(patient_id)
        sb.table("patients").update({
            "monitoring_interval_min": interval_min,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", patient_uuid).execute()
        return {"patient_id": patient_id, "new_interval": interval_min, "status": "updated"}
    except Exception as e:
        print(f"  ⚠️  adjust_monitoring DB write failed: {e}")
        return {"patient_id": patient_id, "new_interval": interval_min, "status": f"error: {e}"}


_PRIORITY_MAP = {
    "high": "urgent",
    "medium": "normal",
    "low": "normal",
}
VALID_TASK_PRIORITIES = {"urgent", "normal", "critical"}

def create_task(patient_id: str, task_type: str, priority: str, description: str, run_id: str = None) -> dict:
    task_id_display = f"TASK-{datetime.utcnow().strftime('%H%M%S')}"
    priority = _PRIORITY_MAP.get(priority, priority)
    if priority not in VALID_TASK_PRIORITIES:
        priority = "normal"
    print(f"📋 CREATE TASK [{priority}] {task_id_display}: {description}")
    try:
        sb = get_supabase()
        patient_uuid = _resolve_patient_uuid(patient_id)
        result = sb.table("tasks").insert({
            "patient_id": patient_uuid,
            "run_id": run_id,
            "task_type": task_type,
            "description": description,
            "priority": priority,
            "status": "open",
        }).execute()
        task_uuid = result.data[0]["id"] if result.data else task_id_display
        return {"task_id": task_uuid, "status": "created", "priority": priority, "description": description}
    except Exception as e:
        print(f"  ⚠️  create_task DB write failed: {e}")
        return {"task_id": task_id_display, "status": f"error: {e}", "priority": priority, "description": description}


def update_priority_rank(patient_id: str, new_rank: int, reason: str) -> dict:
    print(f"🔢 PRIORITY {patient_id}: rank → {new_rank} (reason: {reason})")
    try:
        sb = get_supabase()
        patient_uuid = _resolve_patient_uuid(patient_id)
        sb.table("patients").update({
            "priority_rank": new_rank,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", patient_uuid).execute()
        return {"patient_id": patient_id, "new_rank": new_rank, "status": "updated"}
    except Exception as e:
        print(f"  ⚠️  update_priority_rank DB write failed: {e}")
        return {"patient_id": patient_id, "new_rank": new_rank, "status": f"error: {e}"}


_STATUS_MAP = {
    "under_observation": "watch",
    "under observation": "watch",
    "observation": "watch",
    "monitoring": "watch",
    "stable": "stable",
    "critical": "critical_watch",
    "critical_watch": "critical_watch",
    "escalated": "escalated",
    "watch": "watch",
}
VALID_PATIENT_STATUSES = {"stable", "watch", "critical_watch", "escalated"}

def set_patient_status(patient_id: str, new_status: str) -> dict:
    normalized = _STATUS_MAP.get(new_status.lower(), new_status)
    if normalized not in VALID_PATIENT_STATUSES:
        normalized = "watch"
    print(f"🚨 STATUS {patient_id} → {normalized} (requested: {new_status})")
    try:
        sb = get_supabase()
        patient_uuid = _resolve_patient_uuid(patient_id)
        sb.table("patients").update({
            "status": normalized,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", patient_uuid).execute()
        return {"patient_id": patient_id, "new_status": normalized, "status": "updated"}
    except Exception as e:
        print(f"  ⚠️  set_patient_status DB write failed: {e}")
        return {"patient_id": patient_id, "new_status": normalized, "status": f"error: {e}"}


def request_lab(patient_id: str, test_name: str, urgency: str = "routine", run_id: str = None) -> dict:
    order_id = f"LAB-{datetime.utcnow().strftime('%H%M%S')}"
    print(f"🧪 LAB REQUEST [{urgency}] {patient_id}: {test_name}")
    try:
        sb = get_supabase()
        patient_uuid = _resolve_patient_uuid(patient_id)
        sb.table("lab_results").insert({
            "patient_id": patient_uuid,
            "test_name": test_name,
            "value": "pending",
            "unit": "",
            "urgency": urgency,
            "is_abnormal": False,
            "ordered_at": datetime.utcnow().isoformat(),
        }).execute()
        sb.table("tasks").insert({
            "patient_id": patient_uuid,
            "run_id": run_id,
            "task_type": "lab",
            "description": f"Collect sample for {test_name} [{urgency}]",
            "priority": "urgent" if urgency in ("urgent", "stat") else "normal",
            "status": "open",
        }).execute()
        return {"patient_id": patient_id, "test": test_name, "order_id": order_id, "urgency": urgency}
    except Exception as e:
        print(f"  ⚠️  request_lab DB write failed: {e}")
        return {"patient_id": patient_id, "test": test_name, "order_id": order_id, "status": f"error: {e}"}


def escalate_to_supervisor(patient_id: str, reason: str, severity: str = "high", run_id: str = None) -> dict:
    print(f"🚨 ESCALATE [severity={severity.upper()}] → Supervisor: {patient_id}")
    esc_id = f"ESC-{datetime.utcnow().strftime('%H%M%S')}"
    try:
        sb = get_supabase()
        patient_uuid = _resolve_patient_uuid(patient_id)
        sb.table("patients").update({
            "status": "escalated",
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", patient_uuid).execute()
        sb.table("alerts").insert({
            "patient_id": patient_uuid,
            "run_id": run_id,
            "alert_type": "escalation",
            "target_role": "supervisor",
            "message": f"[ESCALATION] {reason}",
            "priority": "critical",
            "is_read": False,
        }).execute()
        sb.table("tasks").insert({
            "patient_id": patient_uuid,
            "run_id": run_id,
            "task_type": "escalation",
            "description": f"Supervisor review required — {reason}",
            "priority": "critical",
            "status": "open",
        }).execute()
        return {"patient_id": patient_id, "escalation_id": esc_id, "severity": severity, "status": "escalated_to_supervisor"}
    except Exception as e:
        print(f"  ⚠️  escalate DB write failed: {e}")
        return {"patient_id": patient_id, "escalation_id": esc_id, "severity": severity, "status": f"error: {e}"}


def insert_vitals(patient_id: str, vitals: dict) -> dict:
    """Persist simulated vitals from reeval_node into the vitals table."""
    try:
        sb = get_supabase()
        patient_uuid = _resolve_patient_uuid(patient_id)
        result = sb.table("vitals").insert({
            "patient_id": patient_uuid,
            "heart_rate": vitals.get("heart_rate"),
            "blood_pressure_sys": vitals.get("blood_pressure_sys"),
            "blood_pressure_dia": vitals.get("blood_pressure_dia"),
            "spo2": vitals.get("spo2"),
            "temperature": vitals.get("temperature", 37.0),
            "respiratory_rate": vitals.get("respiratory_rate", 16),
            "recorded_at": datetime.utcnow().isoformat(),
        }).execute()
        row_id = result.data[0]["id"] if result.data else None
        print(f"💉 VITALS INSERTED for {patient_id}: HR={vitals.get('heart_rate')}, SpO2={vitals.get('spo2')}")
        return {"status": "inserted", "id": row_id}
    except Exception as e:
        print(f"  ⚠️  insert_vitals DB write failed: {e}")
        return {"status": f"error: {e}"}


TOOL_REGISTRY = {
    "notify": notify,
    "adjust_monitoring": adjust_monitoring,
    "create_task": create_task,
    "update_priority_rank": update_priority_rank,
    "set_patient_status": set_patient_status,
    "request_lab": request_lab,
    "escalate_to_supervisor": escalate_to_supervisor,
    "insert_vitals": insert_vitals,
}


def execute_tool(action: str, params: dict) -> str:
    tool = TOOL_REGISTRY.get(action)
    if not tool:
        return f"ERROR: Unknown tool '{action}'"
    try:
        result = tool(**params)
        return str(result)
    except Exception as e:
        return f"ERROR: {e}"