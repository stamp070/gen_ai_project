import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Play, Square, Settings2, Activity } from 'lucide-react';

interface AgentControlPanelProps {
    status: 'idle' | 'running' | 'completed' | 'error';
    onRun: (scenario: string, maxLoops: number) => void;
    onStop: () => void;
}

const SCENARIOS = [
    { id: 'deteriorating', label: 'Deteriorating' },
    { id: 'stable', label: 'Stable' },
    { id: 'noisy', label: 'Noisy Vitals' },
    { id: 'overloaded_ward', label: 'Overloaded Ward' },
    { id: 'critical', label: 'Critical' },
    { id: 'false_positive', label: 'False Positive' },
];

export function AgentControlPanel({ status, onRun, onStop }: AgentControlPanelProps) {
    const [scenario, setScenario] = useState('deteriorating');
    const [maxLoops, setMaxLoops] = useState(3);

    const isRunning = status === 'running';

    return (
        <Card className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[600px] border-t-2 border-t-[var(--color-primary)] shadow-[0_-10px_40px_-10px_var(--color-primary)] z-50 bg-[#0F172A]/90 backdrop-blur-md">
            <CardContent className="p-4 flex flex-col gap-4">

                <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-[var(--color-primary)]" /> Agent Control Panel
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Status:</span>
                        <span className={`text-xs font-bold uppercase ${status === 'running' ? 'text-[var(--color-primary)] animate-pulse' :
                                status === 'completed' ? 'text-[var(--color-success)]' :
                                    status === 'error' ? 'text-[var(--color-danger)]' : 'text-gray-500'
                            }`}>
                            {status}
                        </span>
                    </div>
                </div>

                <div className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                        <label className="text-xs text-gray-400 font-medium">Scenario</label>
                        <select
                            className="w-full bg-[#1E293B] border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
                            value={scenario}
                            onChange={(e) => setScenario(e.target.value)}
                            disabled={isRunning}
                        >
                            {SCENARIOS.map(s => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex-1 space-y-2">
                        <label className="text-xs text-gray-400 font-medium flex justify-between">
                            <span>Max Loops</span>
                            <span className="text-[var(--color-primary)] font-bold">{maxLoops}</span>
                        </label>
                        <input
                            type="range"
                            className="w-full accent-[var(--color-primary)] disabled:opacity-50"
                            min="1" max="10"
                            value={maxLoops}
                            onChange={(e) => setMaxLoops(parseInt(e.target.value))}
                            disabled={isRunning}
                        />
                    </div>

                    <div className="flex gap-2 shrink-0">
                        {!isRunning ? (
                            <button
                                className="flex items-center gap-2 bg-[var(--color-primary)] text-[#0A0E1A] font-bold px-6 py-2 rounded-md hover:bg-cyan-300 transition-colors shadow-[0_0_15px_rgba(0,212,255,0.4)]"
                                onClick={() => onRun(scenario, maxLoops)}
                            >
                                <Play className="w-4 h-4" fill="currentColor" /> RUN
                            </button>
                        ) : (
                            <button
                                className="flex items-center gap-2 bg-[var(--color-danger)] text-white font-bold px-6 py-2 rounded-md hover:bg-red-500 transition-colors shadow-[0_0_15px_rgba(255,68,68,0.4)]"
                                onClick={onStop}
                            >
                                <Square className="w-4 h-4" fill="currentColor" /> STOP
                            </button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
