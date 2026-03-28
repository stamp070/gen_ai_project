# Hospital Agentic AI System - Code Review & Analysis

**Date**: March 25, 2026  
**Status**: Needs Production Hardening  
**Overall Assessment**: Solid architecture, but critical issues prevent production use

---

## Table of Contents

1. [Overall Assessment](#overall-assessment)
2. [Strengths](#-strengths)
3. [Critical Issues](#-critical-issues)
4. [Recommended Fixes](#-recommended-fixes-priority-order)
5. [Domain-Specific Advice](#-domain-specific-advice)
6. [Next Steps](#-recommended-next-steps)

---

## Overall Assessment

Your hospital AI agent is **well-structured conceptually** for nurse/doctor workload management. The 8-node pipeline is reasonable. However, there are **critical issues** that prevent production use.

### System Architecture

- **Pipeline**: Observe → Memory → Reason → Goal → Governance → Plan → Execute → Reeval (8 nodes)
- **State Management**: Pydantic-based AgentState with full patient context
- **Goal Types**: INCREASE_CERTAINTY, PREVENT_DETERIORATION, REDUCE_FALSE_POSITIVE, BALANCE_WORKLOAD, MAINTAIN_STABILITY
- **Risk Levels**: LOW, MODERATE, HIGH, CRITICAL
- **Available Tools**: notify, adjust_monitoring, create_task, update_priority_rank, set_patient_status, request_lab

---

## ✅ STRENGTHS

| Aspect                     | Status     | Notes                                                                     |
| -------------------------- | ---------- | ------------------------------------------------------------------------- |
| **Separation of Concerns** | ✅ Good    | Each node has a clear role (observe → reason → decide → execute → review) |
| **Governance Layer**       | ✅ Strong  | Policy-based approval system prevents unsafe actions                      |
| **State Management**       | ✅ Clean   | Pydantic models, good use of enums (RiskLevel, PatientStatus, GoalType)   |
| **Reasoning Pipeline**     | ✅ Decent  | Uses LLM to analyze trends in vitals history                              |
| **Memory Context**         | ✅ Present | Tracks previous loops and creates audit trail                             |
| **Loop Control**           | ✅ Exists  | Re-evaluation logic allows iterative refinement                           |

---

## ❌ CRITICAL ISSUES

### 1. **Code Quality Issues**

```python
# governance.py - INCOMPLETE TYPO
## FIXX    ← ⚠️ What needs fixing?
```

- Missing documentation on what "FIXX" refers to

### 2. **Missing Error Handling**

All nodes parse **LLM JSON responses with NO try/catch**:

```python
# reason.py - WILL CRASH if LLM returns bad format
data = json.loads(raw)  # ❌ No error handling
state.risk_level = RiskLevel(data["risk_level"])  # ❌ No validation
```

**Impact**: Single LLM formatting error crashes the entire pipeline  
**Fix**: Add try/catch with fallback responses

### 3. **Unfinished Implementations** (Marked as TODO)

```python
# observe_node
# TODO: validate data from sensor (checking error, missing data, etc.)
# TODO: add data from other sources (lab results, medical notes, etc.)

# memory_node
# TODO: checking trend based on history
```

These are **essential for safety**—missing data validation and trend analysis are dangerous in healthcare.

### 4. **No Security/Authorization**

```python
# main.py
@app.post("/run", response_model=RunResponse)
async def run_agent(req: RunRequest):  # ❌ No auth, no role checks
```

**Issues**:

- Any unauthenticated user can run the agent
- No role (nurse/doctor) verification for sensitive operations
- No logging of who triggered what action

### 5. **No Persistence**

- API responses are ephemeral—no database saves
- Tool execution results logged only in memory, not persisted
- Audit trail lost on process restart
- No way to retrieve historical agent decisions

### 6. **Ward State is Hard-Coded**

```python
# main.py
ward=WardState(
    total_patients=20,
    available_nurses=5,      # ❌ Hard-coded!
    available_doctors=2,      # ❌ Not queried from HIS
    pending_alerts=0,
    workload_score=0.5
)
```

**Problem**: Should query real ward status from Hospital Information System (HIS).

### 7. **Workload Logic is Oversimplified**

```python
# governance.py
elif goal in POLICY["workload_gated"]:
    if state.ward and state.ward.workload_score > 0.7:  # ❌ Just one number
```

Doesn't consider:

- Nursing skill mix (ICU nurse ≠ general ward nurse)
- Patient acuity distribution
- Shift patterns and handovers
- Emergency capacity buffer

### 8. **Limited Tool Set for Nurse/Doctor Workflows**

**Available tools**: `notify`, `adjust_monitoring`, `create_task`, `update_priority_rank`, `set_patient_status`, `request_lab`

**Missing Critical Tools**:

- `assign_staff(patient_id, role, staff_id)` - Assign nurse/doctor to patient
- `escalate_to_supervisor(patient_id, reason)` - Escalate to head nurse/doctor
- `request_specialist(patient_id, specialty, urgency)` - Call cardiologist, etc.
- `document_decision(patient_id, decision_text)` - Clinical note
- `request_medication(patient_id, medication, dose)` - Only lab requests covered
- `schedule_followup(patient_id, task, when)` - Set timed reminders

### 9. **Reeval Logic Might Miss Critical Issues**

```python
# graph.py - Determines if loop continues
def should_reeval(state: AgentState) -> str:
    if state.re_evaluated == False or state.re_eval_count >= 2:
        return "end"  # ⚠️ Max 2 re-evaluations regardless of risk
    return "execute_more"
```

**Problem**: If critical condition persists after 2 loops, the system STOPS instead of escalating.

**Scenario**: Patient SpO2 keeps dropping despite oxygen adjustments:

1. Loop 1: Increase monitoring, notify nurse
2. Loop 2: Insufficient improvement, request lab test
3. Loop 3+: STOPS (max re-evals reached) even though patient is critical ❌

### 10. **No Feedback Loop / Learning**

The system:

- ✅ Monitors patients
- ✅ Decides actions
- ✅ Logs everything
- ❌ **Never learns from outcomes**

No mechanism for:

- Did the nurse actually follow the recommendation?
- Was the decision correct? (retrospective validation)
- Should policies be updated based on patterns?

### 11. **Concurrency Not Handled**

- Can the agent monitor multiple patients in parallel?
- How are race conditions in state updates prevented?
- What if two nodes modify the same patient state simultaneously?
- No message queue or lock mechanism

### 12. **No Rate Limiting / API Protection**

- Someone could hammer `/run` endpoint and crash the system
- No request throttling
- No cost control (unlimited LLM calls)

### 13. **Missing Data Validation**

```python
# main.py
if(len(req.vitals_history) < 3):
    raise HTTPException(status_code=400, detail="At least 3 vital sign readings are required")
```

**Missing checks**:

- Vital signs value ranges (is HR=500 realistic? Is SystolicBP > DiastolicBP?)
- Timestamp ordering (are readings in chronological order?)
- Data type validation (is blood_pressure_sys a number?)

### 14. **No Audit Trail Storage**

```python
state.log(f"[REASON] Risk={state.risk_level}...")  # Logs to memory only
```

For compliance (HIPAA, local regulations):

- Need immutable audit logs in database
- Track who viewed/modified patient records
- Store all AI recommendations with timestamps

---

## 🛠️ RECOMMENDED FIXES (Priority Order)

### **Priority 1 (Week 1 - BLOCKING PRODUCTION)**

#### 1.1 Add Error Handling to All LLM JSON Parsing

**Files**: `reason.py`, `plan.py`, `reeval.py`

**Current**:

```python
data = json.loads(raw)  # Crashes on invalid JSON
state.risk_level = RiskLevel(data["risk_level"])
```

**Fix**:

```python
try:
    data = json.loads(raw)
    state.risk_level = RiskLevel(data.get("risk_level", "moderate"))
    state.risk_confidence = float(data.get("risk_confidence", 0.5))
except (json.JSONDecodeError, ValueError, KeyError) as e:
    state.log(f"[ERROR] LLM returned invalid JSON: {e}")
    # Use safe defaults
    state.risk_level = RiskLevel.MODERATE
    state.risk_confidence = 0.5
    state.termination_reason = "LLM parsing error, using defaults"
```

#### 1.2 Complete TODO Implementations

**observe_node** - Add data validation:

```python
def validate_vitals(vitals: VitalSigns) -> tuple[bool, str]:
    """Validate vital signs are within reasonable ranges"""
    errors = []
    if not (40 <= vitals.heart_rate <= 200):
        errors.append(f"HR out of range: {vitals.heart_rate}")
    if not (70 <= vitals.blood_pressure_sys <= 250):
        errors.append(f"Systolic BP out of range: {vitals.blood_pressure_sys}")
    if not (35 <= vitals.temperature <= 42):
        errors.append(f"Temp out of range: {vitals.temperature}")
    if not (85 <= vitals.spo2 <= 100):
        errors.append(f"SpO2 out of range: {vitals.spo2}")

    return len(errors) == 0, "; ".join(errors)

def observe_node(state: AgentState) -> AgentState:
    if isinstance(state, dict):
        state = AgentState(**state)

    state.log("[OBSERVE] Validating vitals...")
    latest = state.vitals_history[-1]
    is_valid, errors = validate_vitals(latest)

    if not is_valid:
        state.log(f"[OBSERVE] ⚠️ Data validation failed: {errors}")
        state.termination_reason = f"Invalid vitals: {errors}"
        return state

    state.log(f"[OBSERVE] ✅ Vitals valid: HR={latest.heart_rate}, BP={latest.blood_pressure_sys}/{latest.blood_pressure_dia}, SpO2={latest.spo2}")
    return state
```

**memory_node** - Add trend analysis:

```python
def memory_node(state: AgentState) -> AgentState:
    """Load historical context and detect trends"""
    summary = get_memory_summary(state.patient_id)
    state.memory_context = summary

    # Trend analysis
    if len(state.vitals_history) >= 3:
        recent_hr = [v.heart_rate for v in state.vitals_history[-3:]]
        hr_trend = "rising" if recent_hr[-1] > recent_hr[0] else "falling"

        recent_spo2 = [v.spo2 for v in state.vitals_history[-3:]]
        spo2_trend = "rising" if recent_spo2[-1] > recent_spo2[0] else "falling"

        state.memory_context["hr_trend"] = hr_trend
        state.memory_context["spo2_trend"] = spo2_trend
        state.log(f"[MEMORY] Trends: HR {hr_trend}, SpO2 {spo2_trend}")

    state.log(f"[MEMORY] Loaded {summary.get('previous_loops', 0)} previous loops")
    return state
```

#### 1.3 Add Authentication to FastAPI

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials

security = HTTPBearer()

def verify_token(credentials: HTTPAuthCredentials = Depends(security)) -> dict:
    """Verify JWT token and return user info"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
        role = payload.get("role")  # "nurse", "doctor", "admin"
        if not user_id or not role:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"user_id": user_id, "role": role}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/run", response_model=RunResponse)
async def run_agent(req: RunRequest, user: dict = Depends(verify_token)):
    """Run the full agent pipeline for a patient"""
    # Log who triggered this
    print(f"[AUDIT] User {user['user_id']} ({user['role']}) triggered agent for patient {req.patient_id}")

    # Role-based checks if needed
    if not can_run_agent(user['role'], req.patient_id):
        raise HTTPException(status_code=403, detail="Unauthorized")

    # ... rest of implementation
```

#### 1.4 Fix Critical Reeval Logic

```python
# graph.py
def should_reeval(state: AgentState) -> str:
    """Edge condition: loop or end"""
    from agent.state import RiskLevel

    # If critical/high risk, allow more re-evaluations
    if state.risk_level in [RiskLevel.CRITICAL, RiskLevel.HIGH]:
        max_revals = 5
    else:
        max_revals = 2

    if not state.re_evaluated or state.re_eval_count >= max_revals:
        # Before ending, escalate if still critical
        if state.re_eval_count >= max_revals and state.risk_level == RiskLevel.CRITICAL:
            from tools.hospital_tools import execute_tool
            execute_tool("notify", {
                "role": "doctor",
                "priority": "critical",
                "message": f"ESCALATION: Patient {state.patient_id} still critical after {max_revals} cycles"
            })
        return "end"

    return "execute_more"
```

---

### **Priority 2 (Week 2 - FUNCTIONALITY)**

#### 2.1 Add Persistence (Database)

Create `backend/db/models.py`:

```python
from sqlalchemy import Column, String, Float, DateTime, JSON, Integer
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class PatientExecution(Base):
    __tablename__ = "patient_executions"

    id = Column(String, primary_key=True)
    patient_id = Column(String, index=True)
    patient_name = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    final_risk = Column(String)
    final_status = Column(String)
    termination_reason = Column(String)
    action_log = Column(JSON)  # list of actions
    execution_time_sec = Column(Float)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True)
    user_id = Column(String, index=True)
    action = Column(String)
    patient_id = Column(String, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    details = Column(JSON)
```

#### 2.2 Add Nurse/Doctor-Specific Tools

```python
# backend/tools/hospital_tools.py

def assign_staff(patient_id: str, role: str, staff_id: str, reason: str = "") -> dict:
    """Assign nurse or doctor to patient"""
    # Query HIS to assign staff
    from db import db
    assignment = db.create_assignment(patient_id, role, staff_id)
    print(f"👤 ASSIGN {role.upper()} {staff_id} → Patient {patient_id}")
    return {"assignment_id": assignment.id, "status": "assigned"}

def escalate_to_supervisor(patient_id: str, reason: str, severity: str = "high") -> dict:
    """Escalate case to supervisor"""
    print(f"🚨 ESCALATE → Supervisor: {reason} (Severity: {severity})")
    return {"escalation_id": f"ESC-{datetime.utcnow().strftime('%H%M%S')}", "status": "escalated"}

def request_specialist(patient_id: str, specialty: str, urgency: str = "routine") -> dict:
    """Request specialist consultation"""
    print(f"🏥 SPECIALIST REQUEST [{urgency}] {specialty} for patient {patient_id}")
    return {"consultation_id": f"CONS-{datetime.utcnow().strftime('%H%M%S')}", "status": "requested"}

def document_decision(patient_id: str, decision_text: str, decision_type: str = "clinical") -> dict:
    """Document clinical decision in medical record"""
    print(f"📝 DOCUMENT [{decision_type}] {patient_id}: {decision_text}")
    return {"note_id": f"NOTE-{datetime.utcnow().strftime('%H%M%S')}", "status": "saved"}

def request_medication(patient_id: str, medication: str, dose: str, route: str = "IV") -> dict:
    """Request medication order"""
    print(f"💊 MEDICATION ORDER [{route}] {patient_id}: {dose} of {medication}")
    return {"order_id": f"MED-{datetime.utcnow().strftime('%H%M%S')}", "status": "ordered"}

# Update TOOL_REGISTRY
TOOL_REGISTRY = {
    "notify": notify,
    "adjust_monitoring": adjust_monitoring,
    "create_task": create_task,
    "update_priority_rank": update_priority_rank,
    "set_patient_status": set_patient_status,
    "request_lab": request_lab,
    "assign_staff": assign_staff,
    "escalate_to_supervisor": escalate_to_supervisor,
    "request_specialist": request_specialist,
    "document_decision": document_decision,
    "request_medication": request_medication,
}
```

#### 2.3 Query Real Ward State

```python
# backend/main.py
from his_api import HISConnector  # Integrate with your HIS

@app.post("/run", response_model=RunResponse)
async def run_agent(req: RunRequest, user: dict = Depends(verify_token)):
    # ... validation ...

    try:
        # Get real ward state from HIS instead of hard-coded
        his = HISConnector()
        ward_info = his.get_ward_status(ward_id="ICU-1")  # Or determine from patient

        ward = WardState(
            total_patients=ward_info["total_patients"],
            available_nurses=ward_info["available_nurses"],
            available_doctors=ward_info["available_doctors"],
            pending_alerts=ward_info["pending_alerts"],
            workload_score=calculate_workload_score(ward_info)
        )

        # ... rest of implementation
```

#### 2.4 Improve Workload Calculation

```python
def calculate_workload_score(ward_info: dict) -> float:
    """
    Calculate workload as 0.0-1.0
    Based on:
    - Nurse-to-patient ratio
    - Patient acuity distribution
    - Available ICU beds
    """
    nurse_ratio = ward_info["total_patients"] / max(1, ward_info["available_nurses"])

    # Standard ratios: ICU 1:2, HDU 1:4, General 1:6
    if ward_info["ward_type"] == "ICU":
        ratio_threshold = 2.5
    elif ward_info["ward_type"] == "HDU":
        ratio_threshold = 4.5
    else:
        ratio_threshold = 6.5

    ratio_load = min(nurse_ratio / ratio_threshold, 1.0)

    # Weight by acuity
    critical_count = ward_info.get("critical_patients", 0)
    acuity_load = (critical_count * 2) / max(1, ward_info["total_patients"])

    # Combined score
    workload = (ratio_load * 0.6) + (min(acuity_load, 1.0) * 0.4)

    return round(workload, 2)
```

---

### **Priority 3 (Week 3+ - OPTIMIZATION)**

#### 3.1 Add Closed-Loop Feedback

```python
# backend/main.py

@app.post("/feedback/{execution_id}")
async def provide_feedback(
    execution_id: str,
    outcome: str,  # "success" | "partial" | "failed"
    notes: str = "",
    user: dict = Depends(verify_token)
):
    """
    Staff provides feedback on agent recommendation.
    Used to refine policies over time.
    """
    feedback = {
        "execution_id": execution_id,
        "outcome": outcome,
        "user_id": user["user_id"],
        "timestamp": datetime.utcnow(),
        "notes": notes
    }

    db.save_feedback(feedback)

    # Could trigger policy refinement here
    # e.g., if "escalate_to_supervisor" succeeded 95% of the time,
    # increase the threshold for when to use it

    return {"status": "feedback recorded"}
```

#### 3.2 Handle Concurrent Patients

Use LangGraph's built-in support for parallel streams:

```python
# backend/agent/multi_patient_runner.py

async def run_multi_patient(patient_ids: list[str]):
    """Run agent for multiple patients in parallel"""
    from concurrent.futures import ThreadPoolExecutor

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = []
        for patient_id in patient_ids:
            future = executor.submit(run_single_patient, patient_id)
            futures.append(future)

        results = [f.result() for f in futures]

    return results
```

#### 3.3 Fix the "## FIXX" Comment

Remove or clarify in `governance.py`:

```python
# Before:
## FIXX

# After:
# Note: Hospital policy rules are hardcoded for MVP.
# TODO: In production, load these from a policy database (PolicyDB)
# to allow real-time updates without code redeploy.
```

#### 3.4 Add Rate Limiting & Monitoring

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/run")
@limiter.limit("10/minute")  # Max 10 requests per minute per IP
async def run_agent(req: RunRequest, user: dict = Depends(verify_token)):
    # ... implementation
```

---

## 🏥 DOMAIN-SPECIFIC ADVICE

### Use Cases You're NOT Handling Well

| Use Case                       | Current Status   | Issue                                                       |
| ------------------------------ | ---------------- | ----------------------------------------------------------- |
| **Shift Handovers**            | ❌ Not handled   | No mechanism to pause/resume monitoring across shifts       |
| **Nursing Rounds**             | ❌ Poor          | No task batching by location or ward section                |
| **On-Call Escalation**         | ❌ Not supported | No secondary doctor notification or on-call rotation lookup |
| **Patient Transfers**          | ❌ Missing       | State doesn't track location changes (ICU → General Ward)   |
| **Equipment Failures**         | ❌ No validation | No sensor validation or fallback strategies                 |
| **Staff Unavailability**       | ❌ Static        | Workload doesn't adapt when staff calls in sick             |
| **Family Notifications**       | ❌ Missing       | No family/next-of-kin alert capability                      |
| **DrugAllergy Checks**         | ❌ Missing       | Plan doesn't verify medication allergies before ordering    |
| **Interaction Checks**         | ❌ Missing       | No drug-drug interaction checking                           |
| **DND (Do Not Disturb) Hours** | ❌ Missing       | Might notify patient of test during sleep                   |

### Critical Questions to Answer

1. **Accountability**: Who is liable when the AI makes a wrong recommendation? (Legal/malpractice insurance)
2. **Override Capability**: Can nurses/doctors override the agent? Where's the UI for this?
3. **Conflict Resolution**: How do you handle conflicts between doctor AI recommendations and nurse judgment?
4. **Response SLA**: What's the acceptable delay from alert to staff notification?
5. **Regulatory Compliance**: Do you need HIPAA/GDPR audit logging?
6. **Off-the-Record Decision**: If a specialist says "ignore the agent recommendation," does this get logged?

---

## 📊 RECOMMENDED NEXT STEPS

### **Week 1**: Foundation

- ✅ Fix error handling in all nodes
- ✅ Complete TODO implementations (validation + trends)
- ✅ Add authentication to API
- ✅ Fix reeval escalation logic for critical cases
- **Outcome**: System won't crash on LLM errors; has basic security

### **Week 2**: Functionality

- ✅ Add database persistence (PostgreSQL/MongoDB)
- ✅ Add nurse/doctor-specific tools (assign_staff, escalate, specialist)
- ✅ Query real ward state from HIS
- ✅ Improve workload calculation
- **Outcome**: Actions are saved; tools match real workflows; workload is accurate

### **Week 3**: Robustness

- ✅ Add closed-loop feedback mechanism
- ✅ Handle concurrent patient monitoring
- ✅ Clarify/fix code comments
- ✅ Add rate limiting & monitoring
- **Outcome**: System learns from decisions; can scale to multiple patients

### **Month 2**: Piloting

- ✅ Collect feedback from 5-10 nurses/doctors
- ✅ Refine alert thresholds based on false positive rate
- ✅ Update policies based on feedback
- **Outcome**: Better alignment with actual clinical workflows

### **Month 3**: Expansion

- ✅ Expand to multi-ward deployment
- ✅ Add family notification capability
- ✅ Implement shift handover support
- **Outcome**: Production-ready for hospital-wide rollout

---

## Summary Checklist

| Item                               | Priority | Status      |
| ---------------------------------- | -------- | ----------- |
| Error handling in LLM parsing      | P1       | ❌ Not done |
| Complete observe/memory TODOs      | P1       | ❌ Not done |
| Add authentication                 | P1       | ❌ Not done |
| Fix reeval escalation for critical | P1       | ❌ Not done |
| Database persistence               | P2       | ❌ Not done |
| Nurse/doctor tools                 | P2       | ❌ Not done |
| Query real ward state              | P2       | ❌ Not done |
| Improved workload calculation      | P2       | ❌ Not done |
| Closed-loop feedback               | P3       | ❌ Not done |
| Concurrent patient handling        | P3       | ❌ Not done |
| Rate limiting                      | P3       | ❌ Not done |

---

**Questions?** I can help implement any of these fixes. Start with Priority 1 items for the most impact.
