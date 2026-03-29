'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface AgentRun {
  patient_id: string;
  patient_name: string;
  run_id?: string;
  final_status?: string;
  final_risk?: string;
  termination_reason?: string;
  action_log?: string[];
  created_at?: string;
  duration_ms?: number;
}

interface AgentContextType {
  runs: Record<string, AgentRun>;
  saveRun: (patientId: string, run: AgentRun) => void;
  getRun: (patientId: string) => AgentRun | undefined;
  clearRun: (patientId: string) => void;
  clearAll: () => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const [runs, setRuns] = useState<Record<string, AgentRun>>({});

  const saveRun = useCallback((patientId: string, run: AgentRun) => {
    setRuns((prev) => ({
      ...prev,
      [patientId]: {
        ...run,
        created_at: new Date().toISOString(),
      },
    }));
  }, []);

  const getRun = useCallback((patientId: string) => {
    return runs[patientId];
  }, [runs]);

  const clearRun = useCallback((patientId: string) => {
    setRuns((prev) => {
      const next = { ...prev };
      delete next[patientId];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setRuns({});
  }, []);

  return (
    <AgentContext.Provider value={{ runs, saveRun, getRun, clearRun, clearAll }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgentRuns() {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgentRuns must be used within AgentProvider');
  }
  return context;
}
