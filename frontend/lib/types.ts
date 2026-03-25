export interface PatientVitals {
    heart_rate: number;
    blood_pressure_sys: number;
    blood_pressure_dia: number;
    spo2: number;
    temperature: number;
    respiratory_rate: number;
}

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';
export type PatientStatus = 'stable' | 'watch' | 'critical_watch' | 'escalated';

export interface Patient {
    id: string;
    name: string;
    age: number;
    room: string;
    vitals: PatientVitals;
    risk_level: RiskLevel;
    status: PatientStatus;
    last_updated: string;
}

export interface WardState {
    total_patients: number;
    available_nurses: number;
    available_doctors: number;
    pending_alerts: number;
    workload_score: number;
}

export type PipelinePhase = 'observe' | 'memory' | 'reason' | 'goal' | 'governance' | 'plan' | 'execute' | 'reeval';
export type PlanStepStatus = 'pending' | 'done' | 'failed';

export interface PlanStep {
    step_id: string;
    action: string;
    status: PlanStepStatus;
}

export interface AgentProcessState {
    loop_number: number;
    phase: PipelinePhase;
    current_goal: string;
    goal_approved: boolean;
    risk_level: RiskLevel;
    risk_confidence: number;
    plan_steps: PlanStep[];
}

export interface AgentRunResponse {
    patient_id: string;
    final_status: PatientStatus;
    final_risk: RiskLevel;
    termination_reason: string;
    action_log: string[];
}
