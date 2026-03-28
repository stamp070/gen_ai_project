import { Patient, WardState, AgentProcessState, Ward, Staff, Alert, Task } from './types';

export const mockWardState: WardState = {
  total_patients: 28,
  available_nurses: 3,
  available_doctors: 1,
  pending_alerts: 12,
};

export const mockPatients: Patient[] = [
  {
    id: 'P-001', name: 'Eleanor Vance', age: 72, room: 'W1-102',
    diagnosis: 'Septic Shock', admission_date: '2026-03-24',
    vitals: { heart_rate: 118, blood_pressure_sys: 88, blood_pressure_dia: 55, spo2: 94.0, temperature: 38.7, respiratory_rate: 24 },
    risk_level: 'high', status: 'watch', priority_rank: 1, monitoring_interval_min: 5, last_updated: 'Just now',
  },
  {
    id: 'P-002', name: 'Hugh Crain', age: 54, room: 'W1-105',
    diagnosis: 'Post-op Appendectomy', admission_date: '2026-03-26',
    vitals: { heart_rate: 72, blood_pressure_sys: 120, blood_pressure_dia: 80, spo2: 98.0, temperature: 36.5, respiratory_rate: 16 },
    risk_level: 'low', status: 'stable', priority_rank: 4, monitoring_interval_min: 30, last_updated: '5m ago',
  },
  {
    id: 'P-003', 
    name: 'Theodora Crain', age: 61, room: 'W1-201',
    diagnosis: 'Hypertensive Crisis', admission_date: '2026-03-27',
    vitals: { heart_rate: 140, blood_pressure_sys: 180, blood_pressure_dia: 110, spo2: 91.0, temperature: 37.8, respiratory_rate: 28 },
    risk_level: 'critical', status: 'critical_watch', priority_rank: 1, monitoring_interval_min: 2, last_updated: '1m ago',
  },
  {
    id: 'P-004', name: 'Luke Sanderson', age: 45, room: 'W1-108',
    diagnosis: 'Pneumonia', admission_date: '2026-03-25',
    vitals: { heart_rate: 88, blood_pressure_sys: 135, blood_pressure_dia: 88, spo2: 96.0, temperature: 37.1, respiratory_rate: 18 },
    risk_level: 'moderate', status: 'watch', priority_rank: 3, monitoring_interval_min: 15, last_updated: '12m ago',
  },
  {
    id: 'P-005', name: 'Shirley Jackson', age: 38, room: 'W2-301',
    diagnosis: 'DVT', admission_date: '2026-03-26',
    vitals: { heart_rate: 82, blood_pressure_sys: 128, blood_pressure_dia: 84, spo2: 97.0, temperature: 36.9, respiratory_rate: 17 },
    risk_level: 'moderate', status: 'watch', priority_rank: 3, monitoring_interval_min: 20, last_updated: '8m ago',
  },
  {
    id: 'P-006', name: 'Steve Combs', age: 29, room: 'W2-305',
    diagnosis: 'Fracture Recovery', admission_date: '2026-03-23',
    vitals: { heart_rate: 68, blood_pressure_sys: 115, blood_pressure_dia: 74, spo2: 99.0, temperature: 36.6, respiratory_rate: 15 },
    risk_level: 'low', status: 'stable', priority_rank: 5, monitoring_interval_min: 60, last_updated: '22m ago',
  },
];

export const mockWards: Ward[] = [
  { id: 'W1', name: 'Ward 1 — ICU Step-Down', floor: 1, capacity: 12, current_patients: 8 },
  { id: 'W2', name: 'Ward 2 — General', floor: 2, capacity: 20, current_patients: 14 },
  { id: 'W3', name: 'Ward 3 — Surgical', floor: 3, capacity: 16, current_patients: 6 },
];

export const mockStaff: Staff[] = [
  { id: 'S-001', name: 'Dr. Pamela Isley', role: 'doctor', is_available: false, ward_name: 'Ward 1 — ICU Step-Down', patients_assigned: 4 },
  { id: 'S-002', name: 'Dr. Marcus Webb', role: 'doctor', is_available: true, ward_name: 'Ward 2 — General', patients_assigned: 2 },
  { id: 'S-003', name: 'Dr. Lena Okonkwo', role: 'supervisor', is_available: true, ward_name: 'Ward 1 — ICU Step-Down', patients_assigned: 0 },
  { id: 'S-004', name: 'Nurse Rita Vrataski', role: 'nurse', is_available: true, ward_name: 'Ward 1 — ICU Step-Down', patients_assigned: 3 },
  { id: 'S-005', name: 'Nurse James Salter', role: 'nurse', is_available: false, ward_name: 'Ward 2 — General', patients_assigned: 5 },
  { id: 'S-006', name: 'Nurse Ama Owusu', role: 'nurse', is_available: true, ward_name: 'Ward 3 — Surgical', patients_assigned: 2 },
  { id: 'S-007', name: 'Dr. Yuki Tanaka', role: 'doctor', is_available: false, ward_name: 'Ward 3 — Surgical', patients_assigned: 3 },
];

export const mockAlerts: Alert[] = [
  { id: 'A-001', patient_id: 'P-003', patient_name: 'Theodora Crain', alert_type: 'vital_critical', message: 'BP 180/110 — Hypertensive emergency threshold exceeded', priority: 'critical', is_read: false, created_at: '2026-03-28T08:01:00Z' },
  { id: 'A-002', patient_id: 'P-001', patient_name: 'Eleanor Vance', alert_type: 'vital_high', message: 'SpO2 dropped to 93% — supplemental O2 recommended', priority: 'urgent', is_read: false, created_at: '2026-03-28T07:55:00Z' },
  { id: 'A-003', patient_id: 'P-004', patient_name: 'Luke Sanderson', alert_type: 'lab_result', message: 'WBC 14.2 — elevated, possible infection progression', priority: 'urgent', is_read: false, created_at: '2026-03-28T07:40:00Z' },
  { id: 'A-004', patient_id: 'P-005', patient_name: 'Shirley Jackson', alert_type: 'medication', message: 'Anticoagulant dose due in 15 minutes', priority: 'normal', is_read: true, created_at: '2026-03-28T07:20:00Z' },
  { id: 'A-005', patient_id: 'P-002', patient_name: 'Hugh Crain', alert_type: 'discharge', message: 'Patient cleared for discharge — paperwork pending', priority: 'normal', is_read: true, created_at: '2026-03-28T06:50:00Z' },
];

export const mockTasks: Task[] = [
  { id: 'T-001', patient_id: 'P-003', patient_name: 'Theodora Crain', task_type: 'medication', description: 'Administer IV labetalol 20mg — BP control', priority: 'critical', assigned_to: 'S-004', status: 'in_progress', created_at: '2026-03-28T08:02:00Z' },
  { id: 'T-002', patient_id: 'P-001', patient_name: 'Eleanor Vance', task_type: 'monitoring', description: 'Increase SpO2 monitoring to every 5 min', priority: 'urgent', assigned_to: 'S-004', status: 'open', created_at: '2026-03-28T07:56:00Z' },
  { id: 'T-003', patient_id: 'P-004', patient_name: 'Luke Sanderson', task_type: 'lab', description: 'Repeat CBC and CRP — infection markers', priority: 'urgent', assigned_to: undefined, status: 'open', created_at: '2026-03-28T07:42:00Z' },
  { id: 'T-004', patient_id: 'P-005', patient_name: 'Shirley Jackson', task_type: 'medication', description: 'Administer heparin 5000 IU subcutaneous', priority: 'normal', assigned_to: 'S-005', status: 'open', created_at: '2026-03-28T07:20:00Z' },
  { id: 'T-005', patient_id: 'P-002', patient_name: 'Hugh Crain', task_type: 'admin', description: 'Prepare discharge summary and prescription', priority: 'normal', assigned_to: 'S-002', status: 'in_progress', created_at: '2026-03-28T06:55:00Z' },
  { id: 'T-006', patient_id: 'P-006', patient_name: 'Steve Combs', task_type: 'therapy', description: 'Schedule physiotherapy session — morning slot', priority: 'low', assigned_to: undefined, status: 'open', created_at: '2026-03-28T06:30:00Z' },
];

export const mockInitialProcessState: AgentProcessState = {
  loop_number: 1, phase: 'observe', current_goal: 'assess_patient',
  goal_approved: false, risk_level: 'low', risk_confidence: 0, plan_steps: [],
};
