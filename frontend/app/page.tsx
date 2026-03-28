"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Patient, WardState, RiskLevel } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const NODE_IDS = ["observe", "memory", "reason", "goal", "governance", "plan", "execute", "reeval"] as const;
type NodeId = typeof NODE_IDS[number];

const NODE_LABELS: Record<NodeId, string> = {
  observe: "Observe", memory: "Memory", reason: "Reason", goal: "Goal",
  governance: "Policy", plan: "Plan", execute: "Execute", reeval: "Review",
};

const NODE_MSGS: Record<NodeId, string> = {
  observe:    "Collecting vital signs, labs, and ward workload...",
  memory:     "Loading previous goals, plans, and outcomes...",
  reason:     "Analyzing trends and evaluating risk level...",
  goal:       "LLM proposing optimal goal for current state...",
  governance: "Checking hospital policy and authority scope...",
  plan:       "Generating multi-step intervention plan...",
  execute:    "Executing actions step-by-step...",
  reeval:     "Re-evaluating state post-action, looping...",
};

type AgentStatus = "standby" | "active" | "stopped" | "complete" | "error";
interface LogEntry { node: string; msg: string; ts: string; }
interface StreamPayload {
  node?: NodeId; logs?: string[]; risk_level?: RiskLevel; risk_confidence?: number;
  reasoning_summary?: string; current_goal?: string; goal_approved?: boolean;
  plan_steps?: { action: string; params: Record<string, unknown> }[];
  executed_steps?: { action: string; status: string; result?: string }[];
  termination_reason?: string; re_eval_count?: number;
  final_risk?: RiskLevel; final_status?: string; duration_ms?: number;
  message?: string; patient_id?: string;
}

function Badge({ children, color = "gray" }: { children: React.ReactNode; color?: "gray" | "blue" | "green" | "red" | "amber" }) {
  const styles: Record<string, string> = {
    gray:  "bg-slate-100 text-slate-500 border-slate-200",
    blue:  "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    red:   "bg-red-50 text-red-700 border-red-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium ${styles[color]}`}>{children}</span>;
}

function VitalCard({ label, value, unit, warn, ok }: { label: string; value: string | number; unit: string; warn?: boolean; ok?: boolean }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1.5">{label}</p>
      <p className={`text-[22px] font-medium leading-none ${warn ? "text-red-600" : ok ? "text-green-700" : "text-slate-900"}`}>{value}</p>
      <p className="text-[11px] text-slate-400 mt-1">{unit}</p>
    </div>
  );
}

function WardBar({ ward }: { ward: WardState }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 flex items-center gap-6">
      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 mr-2">Ward</span>
      {[
        { label: "Patients", val: ward.total_patients },
        { label: "Nurses", val: ward.available_nurses },
        { label: "Doctors", val: ward.available_doctors },
        { label: "Alerts", val: ward.pending_alerts, warn: ward.pending_alerts > 5 },
      ].map((s) => (
        <div key={s.label} className="flex items-center gap-1.5">
          <span className={`text-[15px] font-medium ${s.warn ? "text-red-600" : "text-slate-800"}`}>{s.val}</span>
          <span className="text-[12px] text-slate-400">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function mapApiPatient(p: Record<string, unknown>): Patient {
  const vitalsArr = Array.isArray(p.vitals) ? p.vitals as Record<string, number>[] : [];
  const v = vitalsArr[0] ?? {};
  return {
    id: (p.patient_code as string) ?? (p.id as string),
    name: p.name as string,
    age: p.age as number,
    room: (p.room as string) ?? "—",
    diagnosis: p.diagnosis as string | undefined,
    admission_date: p.admission_date as string | undefined,
    vitals: {
      heart_rate: v.heart_rate ?? 0,
      blood_pressure_sys: v.blood_pressure_sys ?? 0,
      blood_pressure_dia: v.blood_pressure_dia ?? 0,
      spo2: v.spo2 ?? 0,
      temperature: v.temperature ?? 37.0,
      respiratory_rate: v.respiratory_rate ?? 16,
    },
    risk_level: (p.risk_level as RiskLevel) ?? "low",
    status: (p.status as Patient["status"]) ?? "stable",
    priority_rank: p.priority_rank as number | undefined,
    monitoring_interval_min: p.monitoring_interval_min as number | undefined,
    last_updated: "Just now",
  };
}

export default function DoctorBlythe() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [ward, setWard] = useState<WardState>({ total_patients: 0, available_nurses: 0, available_doctors: 0, pending_alerts: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>("");

  const [isRunning, setIsRunning] = useState(false);
  const [activeNode, setActiveNode] = useState<NodeId | null>(null);
  const [doneNodes, setDoneNodes] = useState<NodeId[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [risk, setRisk] = useState<RiskLevel | null>(null);
  const [riskConf, setRiskConf] = useState<number | null>(null);
  const [reasoning, setReasoning] = useState<string>("");
  const [goal, setGoal] = useState<string>("");
  const [goalApproved, setGoalApproved] = useState<boolean | null>(null);
  const [planSteps, setPlanSteps] = useState<{ action: string; status: string }[]>([]);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("standby");
  const [termReason, setTermReason] = useState<string>("");
  const [reEvalCount, setReEvalCount] = useState(0);

  const logsRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [pRes, wRes] = await Promise.all([
        fetch(`${API_BASE}/patients`),
        fetch(`${API_BASE}/ward-state`),
      ]);
      if (pRes.ok) {
        const data = await pRes.json();
        const mapped = data.map(mapApiPatient);
        setPatients(mapped);
        setSelectedId((prev) => prev || (mapped[0]?.id ?? ""));
      }
      if (wRes.ok) setWard(await wRes.json());
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight;
  }, [logs]);

  const patient = patients.find((p) => p.id === selectedId) ?? patients[0];

  const pushLog = (node: string, msg: string) => {
    const ts = new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs((prev) => [...prev, { node: node.toUpperCase(), msg, ts }]);
  };

  const resetState = () => {
    setActiveNode(null); setDoneNodes([]); setLogs([]); setRisk(null);
    setRiskConf(null); setReasoning(""); setGoal(""); setGoalApproved(null);
    setPlanSteps([]); setTermReason(""); setReEvalCount(0); setAgentStatus("standby");
  };

  const buildVitalsHistory = (p: Patient) => {
    const b = p.vitals;
    const now = new Date();
    return [-20, -10, 0].map((off) => {
      const t = new Date(now.getTime() + off * 60000);
      const pad = (n: number) => String(n).padStart(2, "0");
      const j = (n: number, r: number) => +(n + (Math.random() - 0.5) * r).toFixed(1);
      return {
        timestamp: `${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`,
        heart_rate: j(b.heart_rate, 6),
        blood_pressure_sys: j(b.blood_pressure_sys, 8),
        blood_pressure_dia: j(b.blood_pressure_dia, 6),
        spo2: j(b.spo2, 1.5),
        temperature: j(b.temperature, 0.3),
        respiratory_rate: j(b.respiratory_rate, 3),
      };
    });
  };

  const handleSSEEvent = (eventType: string, payload: StreamPayload) => {
    if (eventType === "run_start") { pushLog("SYS", `Starting analysis for ${payload.patient_id ?? "patient"}...`); return; }
    if (eventType === "node_update" && payload.node) {
      const node = payload.node as NodeId;
      setActiveNode(node);
      setDoneNodes((prev) => (prev.includes(node) ? prev : [...prev, node]));
      pushLog(node, NODE_MSGS[node] ?? `Processing ${node}...`);
      if (payload.logs?.length) payload.logs.forEach((l) => pushLog(node, l));
      if (payload.risk_level) { setRisk(payload.risk_level); if (payload.risk_confidence != null) setRiskConf(Math.round(payload.risk_confidence * 100)); if (payload.reasoning_summary) setReasoning(payload.reasoning_summary); }
      if (payload.current_goal) setGoal(payload.current_goal.replace(/_/g, " "));
      if (payload.goal_approved != null) setGoalApproved(payload.goal_approved);
      if (payload.plan_steps?.length) setPlanSteps(payload.plan_steps.map((s) => ({ action: s.action, status: "pending" })));
      if (payload.executed_steps?.length) setPlanSteps(payload.executed_steps.map((s) => ({ action: s.action, status: s.status })));
      if (payload.termination_reason) setTermReason(payload.termination_reason);
      if (payload.re_eval_count != null) setReEvalCount(payload.re_eval_count);
    }
    if (eventType === "run_complete") {
      setActiveNode(null); setIsRunning(false); setAgentStatus("complete");
      if (payload.final_risk) setRisk(payload.final_risk);
      if (payload.termination_reason) setTermReason(payload.termination_reason);
      pushLog("SYS", `Complete — ${payload.termination_reason ?? "done"} (${payload.duration_ms ?? 0}ms)`);
      loadData();
    }
    if (eventType === "error") { pushLog("ERROR", payload.message ?? "Unknown error"); setIsRunning(false); setAgentStatus("error"); setActiveNode(null); }
  };

  const startAgent = () => {
    if (!patient) return;
    resetState(); setIsRunning(true); setAgentStatus("active");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/run/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patient_id: patient.id, patient_name: patient.name, vitals_history: buildVitalsHistory(patient) }),
          signal: ctrl.signal,
        });
        if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          let eventType = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) { eventType = line.slice(7).trim(); }
            else if (line.startsWith("data: ")) {
              const raw = line.slice(6).trim();
              if (!raw) continue;
              try { handleSSEEvent(eventType, JSON.parse(raw)); } catch { /* ignore */ }
              eventType = "";
            }
          }
        }
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== "AbortError") { pushLog("ERROR", String(err)); setAgentStatus("error"); setIsRunning(false); }
      }
    })();
  };

  const stopAgent = () => { abortRef.current?.abort(); setIsRunning(false); setActiveNode(null); setAgentStatus("stopped"); };

  const agentBadge = { standby: <Badge color="gray">Standby</Badge>, active: <Badge color="blue">Agent active</Badge>, stopped: <Badge color="gray">Stopped</Badge>, complete: <Badge color="green">Complete</Badge>, error: <Badge color="red">Error</Badge> }[agentStatus];
  const riskColor = risk === "critical" ? "text-red-700" : risk === "high" ? "text-red-500" : risk === "moderate" ? "text-amber-600" : risk === "low" ? "text-green-700" : "text-slate-300";
  const riskBg    = risk === "critical" ? "bg-red-50 border-red-200" : risk === "high" ? "bg-red-50 border-red-100" : risk === "moderate" ? "bg-amber-50 border-amber-200" : risk === "low" ? "bg-green-50 border-green-200" : "bg-white border-slate-200";
  const riskLabel = risk ? risk.charAt(0).toUpperCase() + risk.slice(1) : "Pending";
  const isWarn    = (p: Patient) => ["critical", "high"].includes(p.risk_level);
  const barColor  = risk === "critical" || risk === "high" ? "bg-red-500" : risk === "moderate" ? "bg-amber-500" : "bg-green-500";

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-slate-400 text-[14px]">Loading ward data...</p></div>;
  if (!patient) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-slate-400 text-[14px]">No patients found. Check backend connection.</p></div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-5">
      <div className="max-w-[1160px] mx-auto flex flex-col gap-4">
        <header className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-700 rounded-lg flex items-center justify-center text-blue-50 text-[15px] font-medium">B</div>
            <div>
              <div className="text-[15px] font-medium text-slate-900 leading-none">Doctor Blythe <span className="text-slate-400 font-normal text-[13px] ml-1">v2.0</span></div>
              <div className="text-xs text-slate-400 mt-1">Autonomous Clinical Decision Support</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <select value={selectedId} disabled={isRunning} onChange={(e) => { setSelectedId(e.target.value); resetState(); }} className="text-[13px] px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 outline-none disabled:opacity-50 cursor-pointer">
              {patients.map((p) => <option key={p.id} value={p.id}>{p.id} — {p.name} ({p.risk_level})</option>)}
            </select>
            <button onClick={isRunning ? stopAgent : startAgent} className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${isRunning ? "bg-red-600 hover:bg-red-700 text-white" : "bg-blue-700 hover:bg-blue-800 text-white"}`}>
              {isRunning ? "Stop agent" : "Start analysis"}
            </button>
          </div>
        </header>

        <WardBar ward={ward} />

        <section className="grid grid-cols-5 gap-3">
          <VitalCard label="Heart rate"     value={patient.vitals.heart_rate}   unit="bpm"  warn={isWarn(patient)} />
          <VitalCard label="Blood pressure" value={`${patient.vitals.blood_pressure_sys}/${patient.vitals.blood_pressure_dia}`} unit="mmHg" warn={isWarn(patient)} />
          <VitalCard label="SpO2"           value={patient.vitals.spo2}         unit="%"    ok={!isWarn(patient)} />
          <VitalCard label="Temperature"    value={patient.vitals.temperature}  unit="°C"   warn={patient.vitals.temperature > 38} />
          <VitalCard label="Resp. rate"     value={patient.vitals.respiratory_rate} unit="/min" warn={patient.vitals.respiratory_rate > 20} />
        </section>

        <div className="grid grid-cols-[1fr_300px] gap-4">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Thought process pipeline</span>
              <div className="flex items-center gap-2">
                {reEvalCount > 0 && <span className="text-[11px] text-slate-400">Loop {reEvalCount}</span>}
                {agentBadge}
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-start relative mb-6">
                <div className="absolute top-3 left-0 w-full h-px bg-slate-100 z-0" />
                {NODE_IDS.map((id) => {
                  const isActive = activeNode === id && isRunning;
                  const isDone   = doneNodes.includes(id) && activeNode !== id;
                  return (
                    <div key={id} className="relative z-10 flex-1 flex flex-col items-center gap-1.5">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isActive ? "bg-blue-700 border-blue-200 scale-110" : isDone ? "bg-green-600 border-green-200" : "bg-white border-slate-200"}`}>
                        <div className={`w-2 h-2 rounded-full transition-all ${isActive ? "bg-blue-50 animate-ping" : isDone ? "bg-green-50" : "bg-slate-200"}`} />
                      </div>
                      <span className={`text-[10px] font-medium transition-colors ${isActive ? "text-blue-700" : isDone ? "text-green-700" : "text-slate-400"}`}>{NODE_LABELS[id]}</span>
                    </div>
                  );
                })}
              </div>
              <div className="bg-[#0C1C2C] rounded-lg p-4 min-h-[220px]">
                <div className="flex items-center gap-1.5 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" /><div className="w-2.5 h-2.5 rounded-full bg-amber-500" /><div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="ml-2 text-[11px] text-blue-400 font-mono">agent_logs.terminal</span>
                </div>
                <div ref={logsRef} className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto font-mono [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-blue-800 [&::-webkit-scrollbar-thumb]:rounded">
                  {logs.length === 0
                    ? <span className="text-[12px] text-blue-400 opacity-40">_ Initialize system to see logs...</span>
                    : logs.map((l, i) => (
                      <div key={i} className="flex gap-2.5 text-[12px] leading-relaxed">
                        <span className="text-slate-500 shrink-0">{l.ts}</span>
                        <span className="text-blue-400 shrink-0">[{l.node}]</span>
                        <span className="text-blue-200">{l.msg}</span>
                      </div>
                    ))}
                </div>
              </div>
              {reasoning && (
                <div className="mt-4 bg-slate-50 border border-slate-100 rounded-lg p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Reasoning summary</div>
                  <p className="text-[13px] text-slate-600 leading-relaxed">{reasoning}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 text-[13px] font-medium flex-shrink-0">
                  {patient.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <div className="text-[14px] font-medium text-slate-900">{patient.name}</div>
                  <div className="text-[12px] text-slate-400">{patient.id} · Room {patient.room} · Age {patient.age}</div>
                </div>
              </div>
              <Badge color={isWarn(patient) ? "red" : "green"}>{patient.status.replace("_", " ")}</Badge>
            </div>

            {(goal || goalApproved != null) && (
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">Current goal</div>
                <div className="text-[14px] font-medium text-slate-800 capitalize mb-2">{goal || "—"}</div>
                {goalApproved != null && <Badge color={goalApproved ? "green" : "red"}>{goalApproved ? "Policy approved" : "Policy rejected"}</Badge>}
              </div>
            )}

            <div className={`rounded-xl border-2 p-4 transition-all duration-300 ${riskBg}`}>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">Risk assessment</div>
              <div className={`text-[26px] font-medium leading-none ${riskColor}`}>{riskLabel}</div>
              {riskConf != null && (
                <div className="mt-2">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1"><span>Confidence</span><span>{riskConf}%</span></div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${riskConf}%` }} />
                  </div>
                </div>
              )}
              {termReason && <div className="text-[11px] text-slate-400 mt-2">{termReason}</div>}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex-1">
              <div className="px-4 py-3 border-b border-slate-200">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Recommended actions</span>
              </div>
              {planSteps.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-slate-400 italic">Analysis required to generate plan</div>
              ) : (
                <>
                  <div className="p-3 flex flex-col gap-2">
                    {planSteps.map((s, i) => (
                      <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                        <div className={`w-5 h-5 rounded-full ${s.status === "done" ? "bg-green-600" : s.status === "failed" ? "bg-red-500" : "bg-blue-700"} text-white text-[10px] font-medium flex items-center justify-center flex-shrink-0`}>{i + 1}</div>
                        <span className="text-[12px] text-slate-700 leading-snug">{s.action.replace(/_/g, " ")}</span>
                        {s.status === "done" && <span className="ml-auto text-[10px] text-green-600">✓</span>}
                        {s.status === "failed" && <span className="ml-auto text-[10px] text-red-500">✗</span>}
                      </div>
                    ))}
                  </div>
                  {agentStatus === "complete" && (
                    <div className="px-3 pb-3">
                      <button className="w-full py-2.5 bg-slate-900 hover:bg-blue-800 text-white text-[13px] font-medium rounded-lg transition-colors">Confirm all actions</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
