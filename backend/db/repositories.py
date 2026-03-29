"""
db/repositories.py — Supabase CRUD for Doctor Blythe
All functions are async-compatible (supabase-py is sync; wrap if needed)
"""
from __future__ import annotations
import json
from datetime import datetime
from typing import Any, Optional
from uuid import UUID
import re

from db.supabase_client import get_supabase


# ─────────────────────────────────────────────
# PATIENTS
# ─────────────────────────────────────────────

def get_patient_by_code(patient_code: str) -> Optional[dict]:
    sb = get_supabase()
    result = sb.table("patients").select("*").eq("patient_code", patient_code).maybe_single().execute()
    return result.data


def update_patient_status(patient_id: str, status: str, priority_rank: int, interval_min: int):
    sb = get_supabase()
    sb.table("patients").update({
        "status": status,
        "priority_rank": priority_rank,
        "monitoring_interval_min": interval_min,
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("id", patient_id).execute()


# ─────────────────────────────────────────────
# VITALS
# ─────────────────────────────────────────────

def get_recent_vitals(patient_id: str, limit: int = 10) -> list[dict]:
    sb = get_supabase()
    result = sb.table("vitals").select("*").eq(
        "patient_id", patient_id
    ).order("recorded_at", desc=True).limit(limit).execute()
    return result.data or []


def insert_vitals(patient_id: str, vitals: dict) -> str:
    """Insert a single vitals row; returns new row id."""
    sb = get_supabase()
    result = sb.table("vitals").insert({
        "patient_id": patient_id,
        **vitals,
    }).execute()
    return result.data[0]["id"]


# ─────────────────────────────────────────────
# WARD STATE
# ─────────────────────────────────────────────

def get_ward_state(ward_id: str) -> dict:
    """
    Build live WardState from DB:
    - Count active patients in ward
    - Count available staff
    - Count open alerts
    """
    sb = get_supabase()

    # Resolve ward_id: if not a real UUID, fetch the first ward's actual UUID
    UUID_RE = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.I)
    if not UUID_RE.match(ward_id):
        ward_row = sb.table("wards").select("id").limit(1).execute()
        if ward_row.data:
            ward_id = ward_row.data[0]["id"]

    patients = sb.table("patients").select("id", count="exact").eq("ward_id", ward_id).eq("is_active", True).execute()
    nurses = sb.table("staff").select("id", count="exact").eq("ward_id", ward_id).eq("role", "nurse").eq("is_available", True).execute()
    doctors = sb.table("staff").select("id", count="exact").eq("ward_id", ward_id).eq("role", "doctor").eq("is_available", True).execute()
    alerts = sb.table("alerts").select("id", count="exact").eq("is_read", False).execute()

    total = patients.count or 0
    avail_nurses = nurses.count or 0
    avail_doctors = doctors.count or 0
    pending = alerts.count or 0

    # Simple workload formula
    workload = min(1.0, (total / 10) * 0.5 + (pending / 10) * 0.3 + (1 - min(1, avail_nurses / 3)) * 0.2)

    return {
        "total_patients": total,
        "available_nurses": avail_nurses,
        "available_doctors": avail_doctors,
        "pending_alerts": pending,
    }


def save_ward_state_history(ward_id: str, ward_state: dict) -> Optional[str]:
    """
    Save a ward state snapshot for historical tracking & analytics.
    Returns snapshot_id.
    """
    sb = get_supabase()
    snapshot_data = {
        "ward_id": ward_id,
        "total_patients": ward_state.get("total_patients"),
        "available_nurses": ward_state.get("available_nurses"),
        "available_doctors": ward_state.get("available_doctors"),
        "pending_alerts": ward_state.get("pending_alerts"),
        "reccorded_at": datetime.utcnow().isoformat(),
    }
    result = sb.table("ward_state_snapshots").insert(snapshot_data).execute()
    return result.data[0]["id"] if result.data else None


def get_ward_state_history(ward_id: str, limit: int = 100) -> list[dict ]:
    """
    Load recent ward state snapshots for analytics/monitoring.
    """
    sb = get_supabase()
    result = sb.table("ward_state_snapshots").select("*").eq(
        "ward_id", ward_id
    ).order("snapshot_at", desc=True).limit(limit).execute()
    return result.data or []


# ─────────────────────────────────────────────
# AGENT RUNS
# ─────────────────────────────────────────────

async def save_agent_run(patient_code: str, final_state: Any, duration_ms: int) -> Optional[str]:
    """Upsert an agent_run row and update patient status. Returns run_id."""
    sb = get_supabase()

    # Resolve patient UUID
    patient = get_patient_by_code(patient_code)
    if not patient:
        return None

    patient_id = patient["id"]
    fs = final_state if isinstance(final_state, dict) else final_state.model_dump()

    run_data = {
        "patient_id": patient_id,
        "triggered_by": "manual",
        "final_risk_level": fs.get("risk_level"),
        "final_risk_confidence": fs.get("risk_confidence"),
        "final_status": fs.get("status"),
        "final_goal": fs.get("current_goal"),
        "goal_approved": fs.get("goal_approved"),
        "goal_rejection_reason": fs.get("goal_rejection_reason") or "",
        "termination_reason": fs.get("termination_reason") or "",
        "re_eval_count": fs.get("re_eval_count", 0),
        "reasoning_summary": fs.get("reasoning_summary") or "",
        "hypotheses": json.dumps(fs.get("hypotheses", [])),
        "plan_steps": json.dumps([
            s if isinstance(s, dict) else s.model_dump()
            for s in fs.get("plan_steps", [])
        ]),
        "action_log": json.dumps(fs.get("action_log", [])),
        "duration_ms": duration_ms,
    }

    result = sb.table("agent_runs").insert(run_data).execute()
    run_id = result.data[0]["id"] if result.data else None

    # Update patient status in DB
    update_patient_status(
        patient_id,
        status=fs.get("status", "stable"),
        priority_rank=fs.get("priority_rank", 5),
        interval_min=fs.get("monitoring_interval_min", 30),
    )

    return run_id


# ─────────────────────────────────────────────
# AGENT EVENTS (streaming)
# ─────────────────────────────────────────────

def save_agent_event(run_id: str, patient_id: str, node_name: str, loop_index: int, event_type: str, payload: dict):
    sb = get_supabase()
    sb.table("agent_events").insert({
        "run_id": run_id,
        "patient_id": patient_id,
        "node_name": node_name,
        "loop_index": loop_index,
        "event_type": event_type,
        "payload": json.dumps(payload),
    }).execute()


# ─────────────────────────────────────────────
# AGENT MEMORY (persistent — replaces in-memory store)
# ─────────────────────────────────────────────

def save_agent_memory(patient_id_db: str, loop_index: int, state_snapshot: dict):
    """Replace in-memory store — save loop memory to Supabase."""
    sb = get_supabase()
    sb.table("agent_memory").insert({
        "patient_id": patient_id_db,
        "loop_index": loop_index,
        "goal": state_snapshot.get("current_goal"),
        "risk_level": state_snapshot.get("risk_level"),
        "status": state_snapshot.get("status"),
        "action_log": json.dumps(state_snapshot.get("action_log", [])[-5:]),
        "snapshot": json.dumps(state_snapshot),
    }).execute()


def get_agent_memory(patient_id_db: str, last_n: int = 10) -> list[dict]:
    """Load last N loop memories for a patient."""
    sb = get_supabase()
    result = sb.table("agent_memory").select("*").eq(
        "patient_id", patient_id_db
    ).order("loop_index", desc=True).limit(last_n).execute()
    return list(reversed(result.data or []))


def get_agent_memory_summary(patient_id_db: str) -> dict:
    history = get_agent_memory(patient_id_db)
    if not history:
        return {"previous_loops": 0, "history": []}
    return {
        "previous_loops": len(history),
        "history": [
            {
                "loop": h.get("loop_index"),
                "goal": h.get("goal"),
                "risk": h.get("risk_level"),
                "actions": json.loads(h.get("action_log") or "[]"),
            }
            for h in history
        ],
        "last_goal": history[-1].get("goal"),
        "last_risk": history[-1].get("risk_level"),
    }


# ─────────────────────────────────────────────
# ALERTS
# ─────────────────────────────────────────────

def save_alert(patient_id_db: str, run_id: Optional[str], alert_type: str, target_role: str, message: str, priority: str = "normal"):
    sb = get_supabase()
    sb.table("alerts").insert({
        "patient_id": patient_id_db,
        "run_id": run_id,
        "alert_type": alert_type,
        "target_role": target_role,
        "message": message,
        "priority": priority,
    }).execute()


# ─────────────────────────────────────────────
# TASKS
# ─────────────────────────────────────────────

def save_task(patient_id_db: str, run_id: Optional[str], task_type: str, description: str, priority: str = "normal"):
    sb = get_supabase()
    sb.table("tasks").insert({
        "patient_id": patient_id_db,
        "run_id": run_id,
        "task_type": task_type,
        "description": description,
        "priority": priority,
    }).execute()