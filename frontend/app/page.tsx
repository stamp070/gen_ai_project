"use client";

import { useState, useEffect, useRef } from "react";

// ─── Types & Constants ──────────────────────────────────────────────────────
type RiskLevel = "critical" | "low" | null;
type PatientKey = "critical" | "stable";
type NodeId = "observe" | "memory" | "reason" | "goal" | "governance" | "plan" | "execute" | "reeval";

const PATIENTS: Record<PatientKey, {
  name: string; id: string; tag: string; initials: string;
  vitals: { hr: number; bp: string; spo2: number; temp: number; rr: number };
}> = {
  critical: { name: "Somying Rakdee", id: "P-001", tag: "Septic Shock", initials: "SR", vitals: { hr: 122, bp: "85/52", spo2: 93, temp: 38.1, rr: 26 } },
  stable:   { name: "Narong Chaiwong", id: "P-002", tag: "Post-op",      initials: "NC", vitals: { hr: 73,  bp: "120/79", spo2: 98, temp: 36.8, rr: 14 } },
};

const NODES: { id: NodeId; label: string; msg: string }[] = [
  { id: "observe",    label: "Observe",  msg: "Collecting vital signs, labs, ward workload..." },
  { id: "memory",     label: "Memory",   msg: "Loading previous goals, plans, and outcomes..." },
  { id: "reason",     label: "Reason",   msg: "Analyzing trends, detecting anomalies, evaluating risk..." },
  { id: "goal",       label: "Goal",     msg: "LLM proposing optimal goal for current state..." },
  { id: "governance", label: "Policy",   msg: "Checking hospital policy and authority scope..." },
  { id: "plan",       label: "Plan",     msg: "Generating multi-step intervention plan..." },
  { id: "execute",    label: "Execute",  msg: "Executing actions step-by-step..." },
  { id: "reeval",     label: "Review",   msg: "Re-evaluating state post-action, looping..." },
];

const ACTIONS: Record<PatientKey, string[]> = {
  critical: ["Administer IV fluids (NS 500 ml bolus)", "Notify ICU resident on-call", "Continuous SpO2 monitoring"],
  stable:   ["Maintain standard vitals monitoring", "Schedule follow-up check at 06:00", "Continue post-op care protocol"],
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function Badge({ children, color = "gray" }: { children: React.ReactNode; color?: "gray" | "blue" | "green" | "red" }) {
  const styles: Record<string, string> = {
    gray:  "bg-slate-100 text-slate-500 border-slate-200",
    blue:  "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    red:   "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium ${styles[color]}`}>
      {children}
    </span>
  );
}

function VitalCard({ label, value, unit, warn, ok }: { label: string; value: string | number; unit: string; warn?: boolean; ok?: boolean }) {
  const valueColor = warn ? "text-red-600" : ok ? "text-green-700" : "text-slate-900";
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1.5">{label}</p>
      <p className={`text-[22px] font-medium leading-none ${valueColor}`}>{value}</p>
      <p className="text-[11px] text-slate-400 mt-1">{unit}</p>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DoctorBlythe() {
  const [selected, setSelected] = useState<PatientKey>("critical");
  const [isRunning, setIsRunning] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [doneSteps, setDoneSteps] = useState<number[]>([]);
  const [logs, setLogs] = useState<{ node: string; msg: string }[]>([]);
  const [risk, setRisk] = useState<RiskLevel>(null);
  const [plan, setPlan] = useState<string[]>([]);
  const [agentStatus, setAgentStatus] = useState<"standby" | "active" | "stopped" | "complete">("standby");
  const logsRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const patient = PATIENTS[selected];

  // Auto-scroll terminal
  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight;
  }, [logs]);

  const resetUI = () => {
    setActiveStep(-1);
    setDoneSteps([]);
    setLogs([]);
    setRisk(null);
    setPlan([]);
    setAgentStatus("standby");
  };

  const handlePatientChange = (val: PatientKey) => {
    if (isRunning) return;
    setSelected(val);
    resetUI();
  };

  const toggleAgent = () => {
    if (isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRunning(false);
      setActiveStep(-1);
      setAgentStatus("stopped");
      return;
    }

    resetUI();
    setIsRunning(true);
    setAgentStatus("active");

    let step = 0;
    const done: number[] = [];

    timerRef.current = setInterval(() => {
      if (step >= NODES.length) {
        clearInterval(timerRef.current!);
        setIsRunning(false);
        setActiveStep(-1);
        setAgentStatus("complete");
        return;
      }

      const n = NODES[step];
      setActiveStep(step);
      setLogs(prev => [...prev, { node: n.id.toUpperCase(), msg: n.msg }]);

      if (n.id === "reason") {
        setRisk(selected === "critical" ? "critical" : "low");
      }
      if (n.id === "plan") {
        setPlan(ACTIONS[selected]);
      }

      done.push(step);
      setDoneSteps([...done]);
      step++;
    }, 900);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const agentBadge = {
    standby:  <Badge color="gray">Standby</Badge>,
    active:   <Badge color="blue">Agent active</Badge>,
    stopped:  <Badge color="gray">Stopped</Badge>,
    complete: <Badge color="green">Complete</Badge>,
  }[agentStatus];

  const riskBg = risk === "critical" ? "bg-red-50 border-red-200" : risk === "low" ? "bg-green-50 border-green-200" : "bg-white border-slate-200";
  const riskTextColor = risk === "critical" ? "text-red-700" : risk === "low" ? "text-green-700" : "text-slate-300";
  const riskSub = risk === "critical" ? "Immediate intervention required" : risk === "low" ? "Patient stable, continue monitoring" : "Run analysis to assess";

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-5">
      <div className="max-w-[1100px] mx-auto flex flex-col gap-4">

        {/* ── Header ── */}
        <header className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-700 rounded-lg flex items-center justify-center text-blue-50 text-[15px] font-medium">B</div>
            <div>
              <div className="text-[15px] font-medium text-slate-900 leading-none">
                Doctor Blythe <span className="text-slate-400 font-normal text-[13px] ml-1">v2.0</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">Autonomous Clinical Decision Support</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <select
              value={selected}
              disabled={isRunning}
              onChange={e => handlePatientChange(e.target.value as PatientKey)}
              className="text-[13px] px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 outline-none disabled:opacity-50 cursor-pointer"
            >
              <option value="critical">Somying Rakdee — Septic Shock</option>
              <option value="stable">Narong Chaiwong — Post-op</option>
            </select>
            <button
              onClick={toggleAgent}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                isRunning ? "bg-red-600 hover:bg-red-700 text-red-50" : "bg-blue-700 hover:bg-blue-800 text-blue-50"
              }`}
            >
              {isRunning ? "Stop agent" : "Start analysis"}
            </button>
          </div>
        </header>

        {/* ── Vitals ── */}
        <section className="grid grid-cols-5 gap-3">
          <VitalCard label="Heart rate"    value={patient.vitals.hr}   unit="bpm"  warn={selected === "critical"} />
          <VitalCard label="Blood pressure" value={patient.vitals.bp}  unit="mmHg" warn={selected === "critical"} />
          <VitalCard label="SpO2"          value={patient.vitals.spo2} unit="%"    ok={selected !== "critical"} />
          <VitalCard label="Temperature"   value={patient.vitals.temp} unit="°C"   warn={selected === "critical"} />
          <VitalCard label="Resp. rate"    value={patient.vitals.rr}   unit="/min" warn={selected === "critical"} />
        </section>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-[1fr_300px] gap-4">

          {/* Left: Pipeline */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Thought process pipeline</span>
              {agentBadge}
            </div>
            <div className="p-5">

              {/* Steps */}
              <div className="flex items-start relative mb-6">
                <div className="absolute top-3 left-0 w-full h-px bg-slate-100 z-0" />
                {NODES.map((n, i) => {
                  const isActive = activeStep === i && isRunning;
                  const isDone = doneSteps.includes(i);
                  return (
                    <div key={n.id} className="relative z-10 flex-1 flex flex-col items-center gap-1.5">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                        isActive ? "bg-blue-700 border-blue-200 scale-110" : isDone ? "bg-green-600 border-green-200" : "bg-white border-slate-200"
                      }`}>
                        <div className={`w-2 h-2 rounded-full transition-all ${
                          isActive ? "bg-blue-50 animate-ping" : isDone ? "bg-green-50" : "bg-slate-200"
                        }`} />
                      </div>
                      <span className={`text-[10px] font-medium transition-colors ${
                        isActive ? "text-blue-700" : isDone ? "text-green-700" : "text-slate-400"
                      }`}>{n.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Terminal */}
              <div className="bg-[#0C1C2C] rounded-lg p-4 min-h-[200px]">
                <div className="flex items-center gap-1.5 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="ml-2 text-[11px] text-blue-400 font-mono">agent_logs.terminal</span>
                </div>
                <div ref={logsRef} className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto font-mono [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-blue-800 [&::-webkit-scrollbar-thumb]:rounded">
                  {logs.length === 0
                    ? <span className="text-[12px] text-blue-400 opacity-40">_ Initialize system to see logs...</span>
                    : logs.map((l, i) => (
                      <div key={i} className="flex gap-2.5 text-[12px] leading-relaxed">
                        <span className="text-blue-400 shrink-0">[{l.node}]</span>
                        <span className="text-blue-200">{l.msg}</span>
                      </div>
                    ))
                  }
                </div>
              </div>

            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-3">

            {/* Patient card */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 text-[13px] font-medium flex-shrink-0">
                  {patient.initials}
                </div>
                <div>
                  <div className="text-[14px] font-medium text-slate-900">{patient.name}</div>
                  <div className="text-[12px] text-slate-400">{patient.id}</div>
                </div>
              </div>
              <Badge color={selected === "critical" ? "red" : "green"}>{patient.tag}</Badge>
            </div>

            {/* Risk card */}
            <div className={`rounded-xl border-2 p-4 transition-all duration-400 ${riskBg}`}>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1.5">Risk assessment</div>
              <div className={`text-[26px] font-medium leading-none ${riskTextColor}`}>
                {risk === "critical" ? "Critical" : risk === "low" ? "Low" : "Pending"}
              </div>
              <div className="text-[12px] text-slate-400 mt-1">{riskSub}</div>
            </div>

            {/* Plan card */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex-1">
              <div className="px-5 py-3 border-b border-slate-200">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Recommended actions</span>
              </div>
              {plan.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-slate-400 italic">Analysis required to generate plan</div>
              ) : (
                <>
                  <div className="p-3 flex flex-col gap-2">
                    {plan.map((p, i) => (
                      <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                        <div className="w-5 h-5 rounded-full bg-blue-700 text-blue-50 text-[10px] font-medium flex items-center justify-center flex-shrink-0">{i + 1}</div>
                        <span className="text-[13px] text-slate-700">{p}</span>
                      </div>
                    ))}
                  </div>
                  <div className="px-3 pb-3">
                    <button className="w-full py-2.5 bg-slate-900 hover:bg-blue-800 text-slate-50 text-[13px] font-medium rounded-lg transition-colors">
                      Confirm all actions
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}