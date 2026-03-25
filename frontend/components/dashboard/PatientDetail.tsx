import React from 'react';
import { Patient, AgentProcessState } from '../../lib/types';
import { VitalsPanel } from './VitalsPanel';
import { PipelineVisualizer } from './PipelineVisualizer';
import { ActionLog } from './ActionLog';
import { RiskTimeline } from './RiskTimeline';
import { Badge } from '../ui/badge';
import { ArrowLeft, UserRound } from 'lucide-react';

interface PatientDetailProps {
    patient: Patient;
    onBack: () => void;
    // Live state from running the agent
    agentState: AgentProcessState;
    logs: string[];
    riskHistory: { loop: number, riskValue: number }[];
}

export function PatientDetail({ patient, onBack, agentState, logs, riskHistory }: PatientDetailProps) {
    return (
        <div className="flex flex-col h-full space-y-4">
            <header className="flex items-center gap-4 border-b border-gray-800 pb-4">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center">
                        <UserRound className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            {patient.name}
                            <Badge variant={patient.status}>{patient.status.replace('_', ' ')}</Badge>
                            <Badge variant={patient.risk_level}>{patient.risk_level} Risk</Badge>
                        </h2>
                        <p className="text-gray-400 text-sm">
                            ID: {patient.id} • Room: {patient.room} • Age: {patient.age}
                        </p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 h-[calc(100vh-200px)]">
                {/* Left Panel: Vitals & History */}
                <div className="xl:col-span-3 flex flex-col gap-6">
                    <div className="flex-none">
                        <VitalsPanel vitals={patient.vitals} />
                    </div>
                    <div className="flex-1 min-h-[250px]">
                        <RiskTimeline history={riskHistory} />
                    </div>
                </div>

                {/* Center Panel: Pipeline */}
                <div className="xl:col-span-5 flex flex-col border border-gray-800 rounded-xl overflow-hidden shadow-lg">
                    <PipelineVisualizer agentState={agentState} />
                </div>

                {/* Right Panel: Logs */}
                <div className="xl:col-span-4 flex flex-col h-full border border-gray-800 rounded-xl overflow-hidden shadow-lg">
                    <ActionLog logs={logs} streaming={true} />
                </div>
            </div>
        </div>
    );
}
