'use client';

import React, { useState, useEffect } from 'react';
import { WardOverview } from '@/components/dashboard/WardOverview';
import { PatientDetail } from '@/components/dashboard/PatientDetail';
import { AgentControlPanel } from '@/components/dashboard/AgentControlPanel';
import { mockPatients, mockWardState, mockInitialProcessState } from '@/lib/mock-data';
import { AgentProcessState, PipelinePhase } from '@/lib/types';

export default function Home() {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [agentState, setAgentState] = useState<AgentProcessState>(mockInitialProcessState);
  const [logs, setLogs] = useState<string[]>([]);
  const [riskHistory, setRiskHistory] = useState<{ loop: number, riskValue: number }[]>([]);

  const selectedPatient = mockPatients.find(p => p.id === selectedPatientId) || null;

  // Simulator for the Agent Run
  const handleRunAgent = (scenario: string, maxLoops: number) => {
    setAgentStatus('running');
    setLogs([]);
    setRiskHistory([]);
    setAgentState({ ...mockInitialProcessState, loop_number: 1, phase: 'observe' });

    let currentLoop = 1;
    let currentPhaseIndex = 0;
    const phases: PipelinePhase[] = ['observe', 'memory', 'reason', 'goal', 'governance', 'plan', 'execute', 'reeval'];

    // Fake loop simulator
    const interval = setInterval(() => {
      if (currentLoop > maxLoops) {
        setAgentStatus('completed');
        clearInterval(interval);
        return;
      }

      const phase = phases[currentPhaseIndex];
      const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });

      setAgentState(prev => {
        let newState = { ...prev, phase, loop_number: currentLoop };
        if (phase === 'reason') newState.risk_level = 'high';
        if (phase === 'goal') newState.current_goal = 'prevent_deterioration';
        if (phase === 'governance') newState.goal_approved = true;
        if (phase === 'plan') newState.plan_steps = [{ step_id: '1', action: 'Notify nurse', status: 'pending' }, { step_id: '2', action: 'Administer med', status: 'pending' }];
        if (phase === 'execute') newState.plan_steps = prev.plan_steps?.map(s => ({ ...s, status: 'done' })) || [];
        return newState;
      });

      setLogs(prev => [...prev, `[${timeStr}] [${phase.toUpperCase()}] Loop ${currentLoop} — Executing ${phase}...`]);

      if (phase === 'reason') {
        const risk = currentLoop === 1 ? 85 : currentLoop === 2 ? 60 : 45; // simulate decreasing risk
        setRiskHistory(prev => [...prev, { loop: currentLoop, riskValue: risk }]);
        setLogs(prev => [...prev, `[${timeStr}] [REASON] Risk determined: ${risk}%`]);
      }
      if (phase === 'governance') {
        setLogs(prev => [...prev, `[${timeStr}] [GOVERNANCE] ✅ Goal APPROVED`]);
      }

      currentPhaseIndex++;

      if (currentPhaseIndex >= phases.length) {
        currentPhaseIndex = 0;
        currentLoop++;
      }
    }, 1200);

    // Save interval ID to window for clearing on stop
    (window as any).agentInterval = interval;
  };

  const handleStopAgent = () => {
    if ((window as any).agentInterval) {
      clearInterval((window as any).agentInterval);
    }
    setAgentStatus('idle');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if ((window as any).agentInterval) clearInterval((window as any).agentInterval);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] p-6 pb-32">
      <div className="max-w-[1600px] mx-auto h-[calc(100vh-100px)]">

        {!selectedPatientId ? (
          <WardOverview
            wardState={mockWardState}
            patients={mockPatients}
            onSelectPatient={setSelectedPatientId}
          />
        ) : (
          selectedPatient && (
            <PatientDetail
              patient={selectedPatient}
              onBack={() => {
                setSelectedPatientId(null);
                handleStopAgent();
              }}
              agentState={agentState}
              logs={logs}
              riskHistory={riskHistory}
            />
          )
        )}

      </div>

      {/* Agent Control Panel always visible when a patient is selected */}
      {selectedPatientId && (
        <AgentControlPanel
          status={agentStatus}
          onRun={handleRunAgent}
          onStop={handleStopAgent}
        />
      )}
    </main>
  );
}
