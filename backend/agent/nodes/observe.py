from agent.state import AgentState

def validate_vitals(vitals) -> tuple[bool, str]:
    """Validate vital signs are within reasonable ranges"""
    errors = []
    if not (40 <= vitals.heart_rate <= 200):
        errors.append(f"HR out of range: {vitals.heart_rate}")
    if not (70 <= vitals.blood_pressure_sys <= 250):
        errors.append(f"Systolic BP out of range: {vitals.blood_pressure_sys}")
    if vitals.blood_pressure_sys <= vitals.blood_pressure_dia:
        errors.append(f"Invalid BP: Systolic ({vitals.blood_pressure_sys}) <= Diastolic ({vitals.blood_pressure_dia})")
    if not (35 <= vitals.temperature <= 42):
        errors.append(f"Temp out of range: {vitals.temperature}")
    if not (85 <= vitals.spo2 <= 100):
        errors.append(f"SpO2 out of range: {vitals.spo2}")
    if not (8 <= vitals.respiratory_rate <= 40):
        errors.append(f"RR out of range: {vitals.respiratory_rate}")
    
    return len(errors) == 0, "; ".join(errors)

def observe_node(state: AgentState) -> AgentState:
    """
    Node 1: Collect current system state and validate data
    """
    if isinstance(state, dict):
        state = AgentState(**state)

    state.log(f"[OBSERVE] Collecting state and validating vitals...")
    latest = state.vitals_history[-1]
    
    # Validate vital signs
    is_valid, errors = validate_vitals(latest)
    
    if not is_valid:
        state.log(f"[OBSERVE] ⚠️ Data validation FAILED: {errors}")
        state.termination_reason = f"Invalid vitals detected: {errors}"
        return state
    
    state.log(f"[OBSERVE] ✅ Vitals valid: HR={latest.heart_rate}, BP={latest.blood_pressure_sys}/{latest.blood_pressure_dia}, SpO2={latest.spo2}°C, RR={latest.respiratory_rate}")
    return state