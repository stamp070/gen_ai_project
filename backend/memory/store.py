from typing import Any
from datetime import datetime

# In-memory store (swap dict → Redis later)
_store: dict[str, list[dict]] = {}

def save_loop_memory(patient_id: str, state_snapshot: dict):
    """บันทึก memory หลังจบแต่ละ loop"""
    if patient_id not in _store:
        _store[patient_id] = []
    _store[patient_id].append({
        "timestamp": datetime.utcnow().isoformat(),
        **state_snapshot,
    })
    # Keep last 10 loops only
    _store[patient_id] = _store[patient_id][-10:]

def get_memory(patient_id: str) -> list[dict]:
    """ดึง memory ทั้งหมดของ patient"""
    return _store.get(patient_id, [])

def get_memory_summary(patient_id: str) -> dict[str, Any]:
    """สรุป memory สำหรับส่งเข้า LLM"""
    history = get_memory(patient_id)
    if not history:
        return {"previous_loops": 0, "history": []}

    return {
        "previous_loops": len(history),
        "history": [
            {
                "loop": i + 1,
                "goal": h.get("current_goal"),
                "risk": h.get("risk_level"),
                "actions": h.get("action_log", [])[-3:],  # last 3 actions
            }
            for i, h in enumerate(history)
        ],
        "last_goal": history[-1].get("current_goal"),
        "last_risk": history[-1].get("risk_level"),
    }