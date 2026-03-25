from fastapi import FastAPI, HTTPException
from datetime import datetime
from pydantic import BaseModel, Field
from agent.graph import agent_graph
from agent.state import AgentState, VitalSigns, WardState, PatientStatus
import uvicorn
import os

app = FastAPI(title="Hospital Agentic AI", version="0.1.0")

class VitalHistoryInput(BaseModel):
    timestamp: str
    heart_rate: float
    blood_pressure_sys: float
    blood_pressure_dia: float
    spo2: float
    temperature: float = 37.0
    respiratory_rate: float = 16.0

class RunRequest(BaseModel):
    patient_id: str
    patient_name: str
    vitals_history: list[VitalHistoryInput]

class RunResponse(BaseModel):
    patient_id: str
    final_status: str
    final_risk: str | None
    termination_reason: str
    action_log: list[str]

@app.post("/run", response_model=RunResponse)
async def run_agent(req: RunRequest):
    """Run the full agent pipeline for a patient directly from JSON"""

    if(len(req.vitals_history) < 3):
        raise HTTPException(status_code=400, detail="At least 3 vital sign readings are required")

    try:
        # Convert raw history to VitalSigns objects
        history = []
        for v in req.vitals_history:
            # parse string time (e.g. 10:00:00) mapped to today
            ts = datetime.strptime(v.timestamp, "%H:%M:%S").replace(
                year=datetime.now().year, 
                month=datetime.now().month, 
                day=datetime.now().day
            )
            history.append(
                VitalSigns(
                    timestamp=ts,
                    heart_rate=v.heart_rate,
                    blood_pressure_sys=v.blood_pressure_sys,
                    blood_pressure_dia=v.blood_pressure_dia,
                    spo2=v.spo2,
                    temperature=v.temperature,
                    respiratory_rate=v.respiratory_rate
                )
            )

        # Build initial state directly
        initial_state = AgentState(
            patient_id=req.patient_id,
            patient_name=req.patient_name,
            vitals_history=history,
            ward=WardState(
                total_patients=20,
                available_nurses=5,
                available_doctors=2,
                pending_alerts=0,
                workload_score=0.5
            )
        )

        final_state = agent_graph.invoke(initial_state)

        return RunResponse(
            patient_id=final_state["patient_id"],
            final_status=final_state["status"],
            final_risk=final_state["risk_level"],
            termination_reason=final_state["termination_reason"],
            action_log=final_state["action_log"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)


"""
Example json
{
  "patient_id": "P-001",
   "patient_name": "john doe",
  "vitals_history": [
    {
      "timestamp": "10:00:00",
      "heart_rate": 80,
      "blood_pressure_sys": 120,
      "blood_pressure_dia": 80,
      "spo2": 98.0
    },
    {
      "timestamp": "10:10:00",
      "heart_rate": 95,
      "blood_pressure_sys": 105,
      "blood_pressure_dia": 70,
      "spo2": 96.0
    },
    {
      "timestamp": "10:20:00",
      "heart_rate": 118,
      "blood_pressure_sys": 88,
      "blood_pressure_dia": 55,
      "spo2": 94.0
    }
  ]
}

"""