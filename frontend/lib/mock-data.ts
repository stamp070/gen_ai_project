import { Patient, WardState, AgentProcessState } from './types';

export const mockWardState: WardState = {
    total_patients: 28,
    available_nurses: 3,
    available_doctors: 1,
    pending_alerts: 12,
    workload_score: 0.85,
};

export const mockPatients: Patient[] = [
    {
        id: 'P-001',
        name: 'Eleanor Vance',
        age: 72,
        room: 'W1-102',
        vitals: {
            heart_rate: 118,
            blood_pressure_sys: 88,
            blood_pressure_dia: 55,
            spo2: 94.0,
            temperature: 38.7,
            respiratory_rate: 24,
        },
        risk_level: 'high',
        status: 'watch',
        last_updated: 'Just now',
    },
    {
        id: 'P-002',
        name: 'Hugh Crain',
        age: 54,
        room: 'W1-105',
        vitals: {
            heart_rate: 72,
            blood_pressure_sys: 120,
            blood_pressure_dia: 80,
            spo2: 98.0,
            temperature: 36.5,
            respiratory_rate: 16,
        },
        risk_level: 'low',
        status: 'stable',
        last_updated: '5m ago',
    },
    {
        id: 'P-003',
        name: 'Theodora',
        age: 61,
        room: 'W1-201',
        vitals: {
            heart_rate: 140,
            blood_pressure_sys: 180,
            blood_pressure_dia: 110,
            spo2: 91.0,
            temperature: 37.8,
            respiratory_rate: 28,
        },
        risk_level: 'critical',
        status: 'critical_watch',
        last_updated: '1m ago',
    },
    {
        id: 'P-004',
        name: 'Luke Sanderson',
        age: 45,
        room: 'W1-108',
        vitals: {
            heart_rate: 88,
            blood_pressure_sys: 135,
            blood_pressure_dia: 88,
            spo2: 96.0,
            temperature: 37.1,
            respiratory_rate: 18,
        },
        risk_level: 'moderate',
        status: 'watch',
        last_updated: '12m ago',
    },
];

export const mockInitialProcessState: AgentProcessState = {
    loop_number: 1,
    phase: 'observe',
    current_goal: 'assess_patient',
    goal_approved: false,
    risk_level: 'low',
    risk_confidence: 0,
    plan_steps: [],
};
