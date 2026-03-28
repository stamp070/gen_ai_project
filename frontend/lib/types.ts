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
  diagnosis?: string;
  admission_date?: string;
  vitals: PatientVitals;
  risk_level: RiskLevel;
  status: PatientStatus;
  priority_rank?: number;
  monitoring_interval_min?: number;
  last_updated: string;
}

export interface WardState {
  total_patients: number;
  available_nurses: number;
  available_doctors: number;
  pending_alerts: number;
}

export interface Ward {
  id: string;
  name: string;
  floor: number;
  capacity: number;
  current_patients: number;
}

export type StaffRole = 'doctor' | 'nurse' | 'supervisor';

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  is_available: boolean;
  ward_id?: string;
  ward_name?: string;
  patients_assigned?: number;
}

export type AlertPriority = 'normal' | 'urgent' | 'critical';

export interface Alert {
  id: string;
  patient_id: string;
  patient_name: string;
  alert_type: string;
  message: string;
  priority: AlertPriority;
  is_read: boolean;
  created_at: string;
}

export type TaskPriority = 'low' | 'normal' | 'urgent' | 'critical';
export type TaskStatus = 'open' | 'in_progress' | 'done' | 'cancelled';

export interface Task {
  id: string;
  patient_id: string;
  patient_name: string;
  task_type: string;
  description: string;
  priority: TaskPriority;
  assigned_to?: string;
  status: TaskStatus;
  created_at: string;
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
