import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { PipelinePhase, PlanStep, AgentProcessState } from '../../lib/types';
import { CheckCircle2, Circle, XCircle, ChevronRight, Target } from 'lucide-react';
import { motion } from 'framer-motion';

interface PipelineVisualizerProps {
    agentState: AgentProcessState;
}

const PHASES: PipelinePhase[] = [
    'observe', 'memory', 'reason', 'goal', 'governance', 'plan', 'execute', 'reeval'
];

export function PipelineVisualizer({ agentState }: PipelineVisualizerProps) {
    const activeIndex = PHASES.indexOf(agentState.phase);

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row justify-between items-center pb-2">
                <CardTitle>Agent Pipeline Visualizer</CardTitle>
                <div className="px-3 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full text-xs font-bold border border-[var(--color-primary)]/30">
                    LOOP {agentState.loop_number}
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
                {/* Pipeline Nodes */}
                <div className="w-full flex justify-between items-center py-8 relative">
                    {/* Connecting Line */}
                    <div className="absolute left-[5%] right-[5%] top-1/2 h-1 -translate-y-1/2 bg-gray-800 z-0">
                        <motion.div
                            className="h-full bg-[var(--color-primary)]"
                            initial={{ width: '0%' }}
                            animate={{ width: `${(activeIndex / (PHASES.length - 1)) * 100}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>

                    {PHASES.map((phase, index) => {
                        const isActive = index === activeIndex;
                        const isDone = index < activeIndex;

                        return (
                            <div key={phase} className="relative z-10 flex flex-col items-center gap-2">
                                <motion.div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${isActive
                                            ? 'bg-[#0A0E1A] border-[var(--color-primary)] text-[var(--color-primary)] shadow-[0_0_15px_var(--color-primary)]'
                                            : isDone
                                                ? 'bg-[var(--color-success)] border-[var(--color-success)] text-[#0A0E1A]'
                                                : 'bg-[#111827] border-gray-700 text-gray-500'
                                        }`}
                                    animate={isActive ? { scale: [1, 1.1, 1], boxShadow: ['0 0 10px rgba(0,212,255,0.5)', '0 0 20px rgba(0,212,255,0.8)', '0 0 10px rgba(0,212,255,0.5)'] } : { scale: 1 }}
                                    transition={{ duration: 1.5, repeat: isActive ? Infinity : 0 }}
                                >
                                    {isDone ? <CheckCircle2 className="w-6 h-6" /> : <span className="text-xs font-bold">{index + 1}</span>}
                                </motion.div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider absolute -bottom-6 ${isActive ? 'text-[var(--color-primary)]' : isDone ? 'text-[var(--color-success)]' : 'text-gray-500'
                                    }`}>
                                    {phase}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Current State Detail */}
                <div className="mt-auto grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/40 border border-gray-700 p-4 rounded-xl">
                        <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <Target className="w-3 h-3" /> Current Goal
                        </h4>
                        <div className="flex items-center justify-between">
                            <span className="font-mono text-[var(--color-primary)]">{agentState.current_goal || 'Waiting...'}</span>
                            {agentState.goal_approved && (
                                <span className="flex items-center gap-1 text-[var(--color-success)] text-xs bg-[var(--color-success)]/10 px-2 py-0.5 rounded border border-[var(--color-success)]/20">
                                    <CheckCircle2 className="w-3 h-3" /> Approved
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="bg-gray-800/40 border border-gray-700 p-4 rounded-xl">
                        <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Plan Steps</h4>
                        <ul className="space-y-2">
                            {agentState.plan_steps.length === 0 && <li className="text-sm text-gray-500 italic">No plan steps yet</li>}
                            {agentState.plan_steps.map(step => (
                                <li key={step.step_id} className="flex items-center gap-2 text-sm">
                                    {step.status === 'done' ? <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" /> :
                                        step.status === 'failed' ? <XCircle className="w-4 h-4 text-[var(--color-danger)]" /> :
                                            <Circle className="w-4 h-4 text-gray-500" />}
                                    <span className={step.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-200'}>{step.action}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
