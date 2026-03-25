import React, { useState } from 'react';
import { Patient, WardState, PatientStatus } from '../../lib/types';
import { PatientCard } from './PatientCard';
import { Card, CardContent } from '../ui/card';
import { Bell, Users, UserRound, ActivitySquare } from 'lucide-react';

interface WardOverviewProps {
    wardState: WardState;
    patients: Patient[];
    onSelectPatient: (patientId: string) => void;
}

type FilterType = 'all' | 'watch' | 'critical_watch' | 'escalated' | 'stable';

export function WardOverview({ wardState, patients, onSelectPatient }: WardOverviewProps) {
    const [filter, setFilter] = useState<FilterType>('all');

    const filteredPatients = patients.filter(p => filter === 'all' || p.status === filter);

    return (
        <div className="flex flex-col h-full space-y-6">
            <header className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
                        Ward Overview
                    </h1>
                    <p className="text-gray-400 mt-1">Real-time Agentic Monitoring</p>
                </div>

                <div className="flex gap-4">
                    <Card className="bg-[var(--color-card)] border-gray-700 min-w-48">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Users className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Total Patients</p>
                                <p className="text-2xl font-bold text-white">{wardState.total_patients}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-[var(--color-card)] border-gray-700 min-w-48">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-2 bg-red-500/10 rounded-lg relative">
                                <Bell className="w-6 h-6 text-red-400" />
                                {wardState.pending_alerts > 0 && (
                                    <span className="animate-ping absolute top-2 right-2 h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
                                )}
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Active Alerts</p>
                                <p className="text-2xl font-bold text-[var(--color-critical)]">{wardState.pending_alerts}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-[var(--color-card)] border-gray-700 min-w-48 relative overflow-hidden">
                        {/* Simple Workload Gauge visualization */}
                        <div
                            className="absolute bottom-0 left-0 h-1 bg-[var(--color-primary)] transition-all duration-1000"
                            style={{ width: `${wardState.workload_score * 100}%` }}
                        />
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-2 bg-cyan-500/10 rounded-lg">
                                <ActivitySquare className="w-6 h-6 text-[var(--color-primary)]" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Workload</p>
                                <p className="text-2xl font-bold text-white">{(wardState.workload_score * 100).toFixed(0)}%</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </header>

            {/* Filters */}
            <div className="flex gap-2 border-b border-gray-800 pb-4">
                {['all', 'watch', 'critical_watch', 'escalated', 'stable'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f as FilterType)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === f
                                ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800 border border-transparent'
                            }`}
                    >
                        {f.replace('_', ' ').toUpperCase()}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredPatients.map(patient => (
                    <PatientCard
                        key={patient.id}
                        patient={patient}
                        onClick={onSelectPatient}
                    />
                ))}
            </div>
        </div>
    );
}
