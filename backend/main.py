"""
Doctor Blythe — FastAPI Backend (v2)
• SSE real-time streaming via /run/stream
• Supabase persistence (patients, vitals, agent_runs, agent_events, agent_memory)
• Step-by-step execution with state updates after each tool
• Multi-patient ward view
"""

import asyncio
import json
import os
import time
from datetime import datetime
from typing import AsyncGenerator, Optional
from uuid import UUID

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agent.graph import build_graph
from agent.state import AgentState, VitalSigns, WardState, PatientStatus
from db.supabase_client import get_supabase
from db.repositories import (
    get_patient_by_code,
    get_recent_vitals,
    get_ward_state,
    save_agent_run,
    save_agent_event,
    save_agent_memory,
    save_alert,
    save_task,
    update_patient_status,
    save_ward_state_history,
)

load_dotenv()

app = FastAPI(title="Doctor Blythe — Hospital Agentic AI", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Request / Response models
# ─────────────────────────────────────────────

class VitalInput(BaseModel):
    timestamp: str
    heart_rate: float
    blood_pressure_sys: float
    blood_pressure_dia: float
    spo2: float
    temperature: float = 37.0
    respiratory_rate: float = 16.0

class RunRequest(BaseModel):
    patient_id: str          # patient_code e.g. "P-001"
    patient_name: str
    vitals_history: list[VitalInput]

class RunResponse(BaseModel):
    patient_id: str
    run_id: Optional[str]
    final_status: str
    final_risk: Optional[str]
    termination_reason: str
    action_log: list[str]

# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def _build_vitals(raw: list[VitalInput]) -> list[VitalSigns]:
    out = []
    for v in raw:
        ts = datetime.strptime(v.timestamp, "%H:%M:%S").replace(
            year=datetime.now().year,
            month=datetime.now().month,
            day=datetime.now().day,
        )
        out.append(VitalSigns(
            timestamp=ts,
            heart_rate=v.heart_rate,
            blood_pressure_sys=v.blood_pressure_sys,
            blood_pressure_dia=v.blood_pressure_dia,
            spo2=v.spo2,
            temperature=v.temperature,
            respiratory_rate=v.respiratory_rate,
        ))
    return out


def _sse(event: str, data: dict) -> str:
    """Format a single SSE message."""
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


# ─────────────────────────────────────────────
# /run  (sync, non-streaming, backward-compat)
# ─────────────────────────────────────────────

@app.post("/run", response_model=RunResponse)
async def run_agent(req: RunRequest):
    if len(req.vitals_history) < 3:
        raise HTTPException(status_code=400, detail="At least 3 vital readings required")

    try:
        history = _build_vitals(req.vitals_history)
        # Load ward state from Supabase (live data)
        ward_state_dict = get_ward_state("default_ward")
        
        initial_state = AgentState(
            patient_id=req.patient_id,
            patient_name=req.patient_name,
            vitals_history=history,
            ward=WardState(**ward_state_dict),
        )
        graph = build_graph()
        t0 = time.time()
        final = graph.invoke(initial_state)
        duration_ms = int((time.time() - t0) * 1000)

        # Persist to Supabase (best-effort)
        try:
            run_id = await save_agent_run(req.patient_id, final, duration_ms)
            # Save ward state snapshot for analytics
            save_ward_state_history("default_ward", ward_state_dict)
        except Exception:
            run_id = None

        return RunResponse(
            patient_id=final["patient_id"],
            run_id=str(run_id) if run_id else None,
            final_status=final["status"],
            final_risk=final["risk_level"],
            termination_reason=final["termination_reason"],
            action_log=final["action_log"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# /run/stream  (SSE real-time streaming)
# ─────────────────────────────────────────────

async def _stream_agent(req: RunRequest) -> AsyncGenerator[str, None]:
    """
    Runs the agent pipeline and yields SSE events for every node transition.
    Each node in the LangGraph emits events via the agent_event_bus (queue).
    """

    if len(req.vitals_history) < 3:
        yield _sse("error", {"message": "At least 3 vital readings required"})
        return

    history = _build_vitals(req.vitals_history)
    # Load ward state from Supabase (live data)
    ward_state_dict = get_ward_state("a1b2c3d4-e5f6-7890-abcd-1234567890ab")
    
    initial_state = AgentState(
        patient_id=req.patient_id,
        patient_name=req.patient_name,
        vitals_history=history,
        ward=WardState(**ward_state_dict),
    )

    yield _sse("run_start", {
        "patient_id": req.patient_id,
        "patient_name": req.patient_name,
        "timestamp": datetime.utcnow().isoformat(),
    })

    # Use LangGraph streaming mode
    graph = build_graph()
    t0 = time.time()

    try:
        # stream_mode="updates" yields dict of {node_name: state_update} per step
        for chunk in graph.stream(initial_state, stream_mode="updates"):
            for node_name, state_update in chunk.items():
                # Extract latest log entry from the state update
                action_log = state_update.get("action_log", []) if isinstance(state_update, dict) else []
                latest_logs = action_log[-3:] if action_log else []

                payload = {
                    "node": node_name,
                    "timestamp": datetime.utcnow().isoformat(),
                    "logs": latest_logs,
                }

                # Enrich payload per node
                if node_name == "reason" and isinstance(state_update, dict):
                    payload["risk_level"] = state_update.get("risk_level")
                    payload["risk_confidence"] = state_update.get("risk_confidence")
                    payload["reasoning_summary"] = state_update.get("reasoning_summary")
                    payload["hypotheses"] = state_update.get("hypotheses", [])

                elif node_name == "goal" and isinstance(state_update, dict):
                    payload["current_goal"] = state_update.get("current_goal")

                elif node_name == "governance" and isinstance(state_update, dict):
                    payload["goal_approved"] = state_update.get("goal_approved")
                    payload["rejection_reason"] = state_update.get("goal_rejection_reason")

                elif node_name == "plan" and isinstance(state_update, dict):
                    steps = state_update.get("plan_steps", [])
                    if steps:
                        payload["plan_steps"] = [
                            {"action": s.get("action") if isinstance(s, dict) else s.action,
                             "params": s.get("params") if isinstance(s, dict) else s.params}
                            for s in steps
                        ]

                elif node_name == "execute" and isinstance(state_update, dict):
                    steps = state_update.get("plan_steps", [])
                    if steps:
                        payload["executed_steps"] = [
                            {
                                "action": s.get("action") if isinstance(s, dict) else s.action,
                                "status": s.get("status") if isinstance(s, dict) else s.status,
                                "result": s.get("result") if isinstance(s, dict) else s.result,
                            }
                            for s in steps
                        ]
                    payload["patient_status"] = state_update.get("status")

                elif node_name == "reeval" and isinstance(state_update, dict):
                    payload["re_evaluated"] = state_update.get("re_evaluated")
                    payload["termination_reason"] = state_update.get("termination_reason")
                    payload["re_eval_count"] = state_update.get("re_eval_count", 0)

                yield _sse("node_update", payload)
                await asyncio.sleep(0)  # yield control to event loop

    except Exception as e:
        yield _sse("error", {"message": str(e)})
        return

    duration_ms = int((time.time() - t0) * 1000)

    # Final state — get from last chunk
    try:
        final = graph.invoke(initial_state)  # re-run to get final state (or keep last chunk)
    except Exception:
        final = {}

    yield _sse("run_complete", {
        "patient_id": req.patient_id,
        "final_risk": final.get("risk_level") if isinstance(final, dict) else None,
        "final_status": final.get("status") if isinstance(final, dict) else "unknown",
        "termination_reason": final.get("termination_reason") if isinstance(final, dict) else "",
        "action_log": final.get("action_log", []) if isinstance(final, dict) else [],
        "duration_ms": duration_ms,
    })


@app.post("/run/stream")
async def run_agent_stream(req: RunRequest):
    """SSE endpoint — frontend listens for real-time node events."""
    return StreamingResponse(
        _stream_agent(req),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ─────────────────────────────────────────────
# /patients  — ward overview
# ─────────────────────────────────────────────

@app.get("/patients")
async def list_patients():
    """Returns all active patients with latest vitals."""
    try:
        sb = get_supabase()
        result = sb.table("patients").select(
            "*, vitals(heart_rate, blood_pressure_sys, blood_pressure_dia, spo2, temperature, respiratory_rate, recorded_at)"
        ).eq("is_active", True).order("priority_rank").execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/patients/{patient_code}/runs")
async def get_patient_runs(patient_code: str, limit: int = 10):
    """Returns recent agent runs for a patient."""
    try:
        sb = get_supabase()
        patient = sb.table("patients").select("id").eq("patient_code", patient_code).single().execute()
        if not patient.data:
            raise HTTPException(status_code=404, detail="Patient not found")
        runs = sb.table("agent_runs").select("*").eq(
            "patient_id", patient.data["id"]
        ).order("created_at", desc=True).limit(limit).execute()
        return runs.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/alerts")
async def get_alerts(unread_only: bool = False):
    """Returns alerts/notifications."""
    try:
        sb = get_supabase()
        q = sb.table("alerts").select("*, patients(name, patient_code)").order("created_at", desc=True).limit(50)
        if unread_only:
            q = q.eq("is_read", False)
        return q.execute().data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# /staff
# ─────────────────────────────────────────────

@app.get("/staff")
async def list_staff():
    """Returns all staff members with ward info."""
    try:
        sb = get_supabase()
        result = sb.table("staff").select(
            "*, wards(name)"
        ).order("role").execute()
        # Flatten ward name
        data = []
        for row in result.data:
            ward = row.pop("wards", None)
            row["ward_name"] = ward["name"] if ward else None
            data.append(row)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/staff/{staff_id}/availability")
async def update_staff_availability(staff_id: str, available: bool):
    """Toggle staff availability."""
    try:
        sb = get_supabase()
        sb.table("staff").update({"is_available": available}).eq("id", staff_id).execute()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# /wards
# ─────────────────────────────────────────────

@app.get("/wards")
async def list_wards():
    """Returns all wards with live occupancy."""
    try:
        sb = get_supabase()
        wards = sb.table("wards").select("*").execute()
        result = []
        for w in wards.data:
            count = sb.table("patients").select("id", count="exact").eq("ward_id", w["id"]).eq("is_active", True).execute()
            result.append({
                **w,
                "current_patients": count.count or 0,
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# /ward-state
# ─────────────────────────────────────────────

@app.get("/ward-state")
async def get_ward_state_endpoint(ward_id: str = "default_ward"):
    """Returns live ward state (patients, staff, alerts counts)."""
    try:
        data = get_ward_state(ward_id)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# /tasks
# ─────────────────────────────────────────────

@app.get("/tasks")
async def list_tasks(status: Optional[str] = None):
    """Returns tasks, optionally filtered by status (open/in_progress/done/cancelled)."""
    try:
        sb = get_supabase()
        q = sb.table("tasks").select(
            "*, patients(name, patient_code)"
        ).order("created_at", desc=True).limit(100)
        if status:
            q = q.eq("status", status)
        result = q.execute()
        data = []
        for row in result.data:
            patient = row.pop("patients", None)
            row["patient_name"] = patient["name"] if patient else "Unknown"
            row["patient_code"] = patient["patient_code"] if patient else None
            data.append(row)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/tasks/{task_id}/status")
async def update_task_status(task_id: str, status: str):
    """Update task status (open/in_progress/done/cancelled)."""
    try:
        sb = get_supabase()
        sb.table("tasks").update({"status": status}).eq("id", task_id).execute()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/alerts/{alert_id}/read")
async def mark_alert_read(alert_id: str):
    """Mark an alert as read."""
    try:
        sb = get_supabase()
        sb.table("alerts").update({"is_read": True}).eq("id", alert_id).execute()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# Health
# ─────────────────────────────────────────────

@app.get("/")
def health():
    return {"status": "ok", "version": "2.0.0", "service": "Doctor Blythe"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080, reload=True)