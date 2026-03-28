"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types & Constants ──────────────────────────────────────────────────────
type RiskLevel = "low" | "moderate" | "high" | "critical";
type NodeName = "observe" | "memory" | "reason" | "goal" | "governance" | "plan" | "execute" | "reeval";

const PIPELINE_NODES: { id: NodeName; label: string }[] = [
  { id: "observe", label: "Observe" }, { id: "memory", label: "Memory" },
  { id: "reason", label: "Reason" }, { id: "goal", label: "Goal" },
  { id: "governance", label: "Policy" }, { id: "plan", label: "Plan" },
  { id: "execute", label: "Exec" }, { id: "reeval", label: "Review" },
];

const DEMO_PRESETS = {
  critical: { name: "Somying Rakdee", id: "P-001", tag: "Septic Shock", vitals: { hr: 122, bp: "85/52", spo2: 93, temp: 38.1, rr: 26 } },
  stable: { name: "Narong Chaiwong", id: "P-002", tag: "Post-op", vitals: { hr: 73, bp: "120/79", spo2: 98, temp: 36.8, rr: 14 } },
};

// ─── Styled Components ──────────────────────────────────────────────────────

const Badge = ({ children, color = "blue" }: { children: React.ReactNode, color?: string }) => {
  const colors: any = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    red: "bg-red-50 text-red-700 border-red-100",
    green: "bg-green-50 text-green-700 border-green-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
  };
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${colors[color]}`}>{children}</span>;
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function RedesignedBlythe() {
  const [selected, setSelected] = useState<keyof typeof DEMO_PRESETS>("critical");
  const [isRunning, setIsRunning] = useState(false);
  const [activeNode, setActiveNode] = useState<NodeName | null>(null);
  const [logs, setLogs] = useState<{node: string, msg: string, type: string}[]>([]);
  const [risk, setRisk] = useState<RiskLevel | null>(null);
  const [plan, setPlan] = useState<string[]>([]);

  const runAgent = () => {
    if (isRunning) { setIsRunning(false); return; }
    setIsRunning(true); setLogs([]); setRisk(null); setPlan([]);
    
    // Mocking Logic for UI Demo
    let step = 0;
    const interval = setInterval(() => {
      if (step < PIPELINE_NODES.length) {
        const node = PIPELINE_NODES[step].id;
        setActiveNode(node);
        setLogs(prev => [...prev, { node: node.toUpperCase(), msg: `Processing data in ${node} node...`, type: 'info' }]);
        if (node === 'reason') setRisk(selected === 'critical' ? 'critical' : 'low');
        if (node === 'plan') setPlan(['Administer IV Fluids', 'Notify ICU Resident', 'Continuous SpO2 Monitor']);
        step++;
      } else {
        clearInterval(interval);
        setIsRunning(false);
        setActiveNode(null);
      }
    }, 1000);
  };

  const patient = DEMO_PRESETS[selected];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* TOP NAV & PATIENT SELECTOR */}
        <header className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">B</div>
            <div>
              <h1 className="text-lg font-bold leading-none">Doctor Blythe <span className="text-slate-400 font-medium text-sm ml-2">v2.0</span></h1>
              <p className="text-xs text-slate-500 mt-1 font-medium">Autonomous Clinical Decision Support</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <select 
              className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 ring-indigo-500"
              value={selected} onChange={(e) => setSelected(e.target.value as any)} disabled={isRunning}
            >
              <option value="critical">Patient: Somying (Critical)</option>
              <option value="stable">Patient: Narong (Stable)</option>
            </select>
            <button 
              onClick={runAgent}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${isRunning ? 'bg-red-500 text-white animate-pulse' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'}`}
            >
              {isRunning ? "STOP AGENT" : "START ANALYSIS"}
            </button>
          </div>
        </header>

        {/* VITALS GRID */}
        <section className="grid grid-cols-5 gap-4">
          {[
            { label: 'Heart Rate', val: patient.vitals.hr, unit: 'bpm', color: 'text-rose-600' },
            { label: 'Blood Pressure', val: patient.vitals.bp, unit: 'mmHg', color: 'text-slate-900' },
            { label: 'SpO2', val: patient.vitals.spo2, unit: '%', color: 'text-emerald-600' },
            { label: 'Temperature', val: patient.vitals.temp, unit: '°C', color: 'text-amber-600' },
            { label: 'Resp. Rate', val: patient.vitals.rr, unit: '/min', color: 'text-slate-900' },
          ].map((v, i) => (
            <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{v.label}</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className={`text-2xl font-black ${v.color}`}>{v.val}</span>
                <span className="text-xs text-slate-400 font-medium">{v.unit}</span>
              </div>
            </div>
          ))}
        </section>

        {/* MAIN DASHBOARD CONTENT */}
        <div className="grid grid-cols-12 gap-6">
          
          {/* LEFT: AGENT BRAIN */}
          <div className="col-span-12 lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                <h2 className="text-sm font-bold uppercase tracking-tight text-slate-600">Thought Process Pipeline</h2>
                {isRunning && <Badge color="blue">Agent Active</Badge>}
              </div>
              <div className="p-8">
                <div className="relative flex justify-between">
                  {/* Connecting Line */}
                  <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-100 -z-0"></div>
                  {PIPELINE_NODES.map((node) => (
                    <div key={node.id} className="relative z-10 flex flex-col items-center gap-3">
                      <div className={`w-10 h-10 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${
                        activeNode === node.id ? 'bg-indigo-600 border-indigo-100 scale-125 shadow-lg shadow-indigo-200' : 'bg-white border-slate-50'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${activeNode === node.id ? 'bg-white animate-ping' : 'bg-slate-300'}`} />
                      </div>
                      <span className={`text-[10px] font-bold uppercase ${activeNode === node.id ? 'text-indigo-600' : 'text-slate-400'}`}>{node.label}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-10 bg-slate-900 rounded-2xl p-6 min-h-[240px] font-mono text-sm shadow-inner">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-slate-500 ml-2 text-xs">agent_logs.terminal</span>
                  </div>
                  <div className="space-y-2 overflow-y-auto max-h-[160px] custom-scrollbar">
                    {logs.length === 0 && <p className="text-slate-600">_ Initialize system to see logs...</p>}
                    {logs.map((log, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="text-indigo-400 shrink-0">[{log.node}]</span>
                        <span className="text-slate-300">{log.msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: CLINICAL DECISION */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            
            {/* RISK CARD */}
            <div className={`rounded-3xl p-6 border-2 transition-all duration-500 ${
              risk === 'critical' ? 'bg-rose-50 border-rose-200' : risk === 'low' ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Risk Assessment</h3>
                  <p className={`text-3xl font-black uppercase ${risk === 'critical' ? 'text-rose-600' : risk === 'low' ? 'text-emerald-600' : 'text-slate-300'}`}>
                    {risk || "Pending"}
                  </p>
                </div>
                {risk && <div className={`p-3 rounded-2xl ${risk === 'critical' ? 'bg-rose-500' : 'bg-emerald-500'} text-white`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>}
              </div>
            </div>

            {/* PLAN CARD */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Recommended Actions</h3>
              <div className="space-y-3">
                {plan.length > 0 ? plan.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="h-6 w-6 bg-white border border-slate-200 rounded-md flex items-center justify-center text-[10px] font-bold">{i+1}</div>
                    <span className="text-sm font-semibold text-slate-700">{p}</span>
                  </div>
                )) : (
                  <div className="py-10 text-center text-slate-400 text-sm italic">Analysis required to generate plan</div>
                )}
              </div>
              {plan.length > 0 && (
                <button className="w-full mt-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors uppercase tracking-widest">
                  Confirm All Actions
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
    </div>
  );
}