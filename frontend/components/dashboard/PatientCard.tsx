import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Activity, Thermometer, Droplets, Wind, HeartPulse } from 'lucide-react';
import { Patient } from '../../lib/types';

interface PatientCardProps {
    patient: Patient;
    onClick: (patientId: string) => void;
}

export function PatientCard({ patient, onClick }: PatientCardProps) {
    return (
        <Card
            className="cursor-pointer hover:border-[var(--color-primary)] transition-all cursor-pointer hover:shadow-[0_0_15px_rgba(0,212,255,0.2)]"
            onClick={() => onClick(patient.id)}
        >
            <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-white">{patient.name}</h3>
                        <p className="text-sm text-gray-400">
                            {patient.id} • Room {patient.room} • {patient.age}y
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                        <Badge variant={patient.risk_level}>{patient.risk_level} Risk</Badge>
                        <Badge variant={patient.status}>{patient.status.replace('_', ' ')}</Badge>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-pink-500" />
                        <span className="text-gray-300 font-mono text-sm">{patient.vitals.heart_rate} bpm</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <HeartPulse className="w-4 h-4 text-purple-500" />
                        <span className="text-gray-300 font-mono text-sm">
                            {patient.vitals.blood_pressure_sys}/{patient.vitals.blood_pressure_dia}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-blue-400" />
                        <span className="text-gray-300 font-mono text-sm">{patient.vitals.spo2}% SpO2</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-orange-400" />
                        <span className="text-gray-300 font-mono text-sm">{patient.vitals.temperature}°C</span>
                    </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-800 flex justify-between items-center text-xs text-gray-500">
                    <span>Updated: {patient.last_updated}</span>
                    <span className="text-[var(--color-primary)] font-medium group-hover:underline">View Details →</span>
                </div>
            </CardContent>
        </Card>
    );
}
