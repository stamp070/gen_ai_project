from typing import Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

class GoalType(str, Enum):
    INCREASE_CERTAINTY    = "increase_certainty"
    PREVENT_DETERIORATION = "prevent_deterioration"
    REDUCE_FALSE_POSITIVE = "reduce_false_positive"
    BALANCE_WORKLOAD      = "balance_workload"
    MAINTAIN_STABILITY    = "maintain_stability"

class RiskLevel(str, Enum):
    LOW = "low"; MODERATE = "moderate"
    HIGH = "high"; CRITICAL = "critical"

class PatientStatus(str, Enum):
    STABLE = "stable"; WATCH = "watch"
    CRITICAL_WATCH = "critical_watch"; ESCALATED = "escalated"

class VitalSigns(BaseModel):
    heart_rate: float
    blood_pressure_sys: float
    blood_pressure_dia: float
    spo2: float
    temperature: float
    respiratory_rate: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class WardState(BaseModel):
    total_patients: int
    available_nurses: int
    available_doctors: int
    pending_alerts: int
    workload_score: float   # 0.0–1.0

class PlanStep(BaseModel):
    step_id: str
    action: str             # tool name
    params: dict[str, Any]
    status: str = "pending" # pending|done|failed|skipped
    result: Optional[str] = None

class AgentState(BaseModel):
    patient_id: str
    patient_name: str
    vitals_history: list[VitalSigns] = Field(default_factory=list)
    lab_results: dict[str, Any] = Field(default_factory=dict)
    medical_notes: list[str] = Field(default_factory=list)
    priority_rank: int = 5
    status: PatientStatus = PatientStatus.STABLE
    monitoring_interval_min: int = 30

    # Environment
    ward: Optional[WardState] = None

    # Reasoning outputs
    risk_level: Optional[RiskLevel] = None
    risk_confidence: float = 0.0
    reasoning_summary: str = ""
    hypotheses: list[str] = Field(default_factory=list)

    # Goal
    current_goal: Optional[GoalType] = None
    goal_approved: bool = False
    goal_rejection_reason: str = ""

    # Plan
    plan_steps: list[PlanStep] = Field(default_factory=list)
    current_step_index: int = 0

    # Loop control
    re_evaluated: bool = False
    re_eval_count: int = 0
    termination_reason: str = ""

    
    # Memory & audit
    memory_context: dict[str, Any] = Field(default_factory=dict)
    action_log: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    def log(self, msg: str):
        ts = datetime.utcnow().strftime("%H:%M:%S")
        self.action_log.append(f"[{ts}] {msg}")
        self.updated_at = datetime.utcnow()