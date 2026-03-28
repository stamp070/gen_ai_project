"""
Tools ที่ Agent เรียกใช้ได้ — ใน production เชื่อมต่อ HIS API
ตอนนี้เป็น mock ที่ print + return result
"""
from datetime import datetime

def notify(role: str, message: str, priority: str = "normal") -> str:
    print(f"📢 NOTIFY [{priority.upper()}] → {role}: {message}")
    return f"Notified {role} at {datetime.utcnow().strftime('%H:%M:%S')}"

def adjust_monitoring(patient_id: str, interval_min: int) -> dict:
    print(f"⏱  MONITORING {patient_id} → every {interval_min} min")
    return {"patient_id": patient_id, "new_interval": interval_min, "status": "updated"}

def create_task(patient_id: str, task_type: str, priority: str, description: str) -> dict:
    task_id = f"TASK-{datetime.utcnow().strftime('%H%M%S')}"
    print(f"📋 CREATE TASK [{priority}] {task_id}: {description}")
    return {"task_id": task_id, "status": "created", "priority": priority, "description": description}

def update_priority_rank(patient_id: str, new_rank: int, reason: str) -> dict:
    print(f"🔢 PRIORITY {patient_id}: rank → {new_rank} (reason: {reason})")
    return {"patient_id": patient_id, "new_rank": new_rank, "status": "updated"}

def set_patient_status(patient_id: str, new_status: str) -> dict:
    print(f"🚨 STATUS {patient_id} → {new_status}")
    return {"patient_id": patient_id, "new_status": new_status, "status": "updated"}

def request_lab(patient_id: str, test_name: str, urgency: str = "routine") -> dict:
    print(f"🧪 LAB REQUEST [{urgency}] {patient_id}: {test_name}")
    return {"patient_id": patient_id, "test": test_name, "order_id": f"LAB-{datetime.utcnow().strftime('%H%M%S')}"}

def escalate_to_supervisor(patient_id: str, reason: str, severity: str = "high") -> dict:
    """Escalate case to head nurse/doctor supervisor"""
    print(f"🚨 ESCALATE [severity={severity.upper()}] → Supervisor: Patient {patient_id}")
    print(f"   Reason: {reason}")
    return {
        "patient_id": patient_id,
        "escalation_id": f"ESC-{datetime.utcnow().strftime('%H%M%S')}",
        "severity": severity,
        "status": "escalated_to_supervisor"
    }

TOOL_REGISTRY = {
    "notify": notify,
    "adjust_monitoring": adjust_monitoring,
    "create_task": create_task,
    "update_priority_rank": update_priority_rank,
    "set_patient_status": set_patient_status,
    "request_lab": request_lab,
    "escalate_to_supervisor": escalate_to_supervisor,
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