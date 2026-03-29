"use client";

import { useState, useEffect, useCallback } from "react";
import { Patient, Alert, Task, Ward, Staff } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function Badge({ children, color = "gray" }: { children: React.ReactNode; color?: "gray" | "blue" | "green" | "red" | "amber" }) {
  const s: Record<string, string> = {
    gray:  "bg-slate-100 text-slate-500 border-slate-200",
    blue:  "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    red:   "bg-red-50 text-red-700 border-red-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${s[color]}`}>{children}</span>;
}

function riskColor(r: string) { return r === "critical" ? "red" : r === "high" ? "red" : r === "moderate" ? "amber" : "green"; }
function priorityColor(p: string) { return p === "critical" ? "red" : p === "urgent" ? "amber" : "gray"; }
function taskStatusColor(s: string) { return s === "done" ? "green" : s === "in_progress" ? "blue" : s === "cancelled" ? "gray" : "amber"; }

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

function WardCards({ wards }: { wards: Ward[] }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {wards.map((w) => {
        const pct = Math.round((w.current_patients / w.capacity) * 100);
        const barColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-green-500";
        return (
          <div key={w.id} className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-[13px] font-medium text-slate-900 leading-snug">{w.name}</div>
                <div className="text-[12px] text-slate-400 mt-0.5">Floor {w.floor}</div>
              </div>
              <Badge color={pct >= 90 ? "red" : pct >= 70 ? "amber" : "green"}>{pct}% full</Badge>
            </div>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-[28px] font-medium text-slate-900 leading-none">{w.current_patients}</span>
              <span className="text-[13px] text-slate-400">/ {w.capacity} beds</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

type Tab = "overview" | "priority" | "alerts" | "tasks";

export default function WardPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [wardState, setWardState] = useState({ total_patients: 0, available_nurses: 0, available_doctors: 0, pending_alerts: 0 });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [pRes, aRes, tRes, wRes, wsRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/patients`),
        fetch(`${API_BASE}/alerts`),
        fetch(`${API_BASE}/tasks`),
        fetch(`${API_BASE}/wards`),
        fetch(`${API_BASE}/ward-state`),
        fetch(`${API_BASE}/staff`),
      ]);

      if (pRes.ok) {
        const data = await pRes.json();
        setPatients(data.map((p: Record<string, unknown>) => {
          const vitalsArr = Array.isArray(p.vitals) ? p.vitals as Record<string, number>[] : [];
          const v = vitalsArr[0] ?? {};
          return {
            id: (p.patient_code as string) ?? (p.id as string),
            name: p.name as string,
            age: p.age as number,
            room: (p.room as string) ?? "—",
            diagnosis: p.diagnosis as string,
            vitals: { heart_rate: v.heart_rate ?? 0, blood_pressure_sys: v.blood_pressure_sys ?? 0, blood_pressure_dia: v.blood_pressure_dia ?? 0, spo2: v.spo2 ?? 0, temperature: v.temperature ?? 37, respiratory_rate: v.respiratory_rate ?? 16 },
            risk_level: p.risk_level ?? "low",
            status: p.status ?? "stable",
            priority_rank: p.priority_rank,
            monitoring_interval_min: p.monitoring_interval_min,
            last_updated: "Just now",
          };
        }));
      }

      if (aRes.ok) {
        const data = await aRes.json();
        setAlerts(data.map((a: Record<string, unknown>) => ({
          id: a.id,
          patient_id: a.patient_id,
          patient_name: (a.patients as Record<string, string>)?.name ?? "Unknown",
          alert_type: a.alert_type,
          message: a.message,
          priority: a.priority ?? "normal",
          is_read: a.is_read,
          created_at: a.created_at,
        })));
      }

      if (tRes.ok) {
        const data = await tRes.json();
        setTasks(data.map((t: Record<string, unknown>) => ({
          id: t.id,
          patient_id: t.patient_id,
          patient_name: (t.patient_name as string) ?? "Unknown",
          task_type: t.task_type,
          description: t.description,
          priority: t.priority ?? "normal",
          assigned_to: t.assigned_to,
          status: t.status ?? "open",
          created_at: t.created_at,
        })));
      }

      if (wRes.ok) {
        const data = await wRes.json();
        setWards(data.map((w: Record<string, unknown>) => ({
          id: w.id as string,
          name: w.name as string,
          floor: w.floor as number,
          capacity: w.capacity as number,
          current_patients: w.current_patients as number,
        })));
      }

      if (wsRes.ok) setWardState(await wsRes.json());
      if (sRes.ok) setStaff(await sRes.json());
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const markRead = async (id: string) => {
    await fetch(`${API_BASE}/alerts/${id}/read`, { method: "PATCH" });
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, is_read: true } : a));
  };

  const updateTaskStatus = async (id: string, status: string) => {
    await fetch(`${API_BASE}/tasks/${id}/status?status=${status}`, { method: "PATCH" });
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: t.status } as Task : t));
    loadData();
  };

  const assignTask = async (taskId: string, staffId: string) => {
    await fetch(`${API_BASE}/tasks/${taskId}/assign?staff_id=${staffId}`, { method: "PATCH" });
    loadData();
  };

  const sortedPatients = [...patients].sort((a, b) => (a.priority_rank ?? 99) - (b.priority_rank ?? 99));
  const unreadCount = alerts.filter((a) => !a.is_read).length;
  const openTasks = tasks.filter((t) => t.status === "open").length;

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "priority", label: "Priority Queue", count: patients.length },
    { key: "alerts",   label: "Alerts",         count: unreadCount || undefined },
    { key: "tasks",    label: "Tasks",           count: openTasks || undefined },
  ];

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-slate-400 text-[14px]">Loading ward data...</p></div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-5">
      <div className="max-w-[1160px] mx-auto flex flex-col gap-4">

        <header className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-700 rounded-lg flex items-center justify-center text-blue-50 text-[15px] font-medium">B</div>
            <div>
              <div className="text-[15px] font-medium text-slate-900 leading-none">Ward Management</div>
              <div className="text-xs text-slate-400 mt-1">Priority, alerts, and task board</div>
            </div>
          </div>
          <div className="flex items-center gap-5 text-right">
            {[
              { label: "Patients", val: wardState.total_patients },
              { label: "Nurses",   val: wardState.available_nurses },
              { label: "Doctors",  val: wardState.available_doctors },
              { label: "Alerts",   val: unreadCount, warn: true },
            ].map((s) => (
              <div key={s.label}>
                <div className={`text-[18px] font-medium leading-none ${s.warn && unreadCount > 0 ? "text-red-600" : "text-slate-900"}`}>{s.val}</div>
                <div className="text-[11px] text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>
        </header>

        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-2">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${tab === t.key ? "bg-blue-700 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
              {t.label}
              {t.count != null && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-blue-600 text-blue-100" : "bg-slate-100 text-slate-500"}`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="flex flex-col gap-4">
            {wards.length > 0 ? <WardCards wards={wards} /> : <p className="text-slate-400 text-[13px] text-center py-4">No ward data available</p>}
          </div>
        )}

        {tab === "priority" && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Priority queue — {sortedPatients.length} patients</span>
            </div>
            <div className="divide-y divide-slate-100">
              {sortedPatients.map((p, i) => (
                <div key={p.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-medium text-slate-500 flex-shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-slate-900">{p.name}</div>
                    <div className="text-[11px] text-slate-400">{p.id} · {p.room} · {p.diagnosis ?? "—"}</div>
                  </div>
                  <div className="flex gap-2">
                    <Badge color={riskColor(p.risk_level) as "red" | "amber" | "green"}>{p.risk_level}</Badge>
                    {p.monitoring_interval_min && <Badge color="gray">Every {p.monitoring_interval_min}m</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "alerts" && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Alerts</span>
              {unreadCount > 0 && <span className="text-[11px] text-slate-500">{unreadCount} unread</span>}
            </div>
            <div className="divide-y divide-slate-100">
              {alerts.length === 0 && <p className="text-center text-slate-400 text-[13px] py-8">No alerts</p>}
              {alerts.map((a) => (
                <div key={a.id} className={`flex items-start gap-4 px-5 py-3.5 ${a.is_read ? "opacity-50" : ""}`}>
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.priority === "critical" ? "bg-red-500" : a.priority === "urgent" ? "bg-amber-500" : "bg-slate-300"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[13px] font-medium text-slate-900">{a.patient_name}</span>
                      <Badge color={priorityColor(a.priority) as "red" | "amber" | "gray"}>{a.priority}</Badge>
                    </div>
                    <div className="text-[12px] text-slate-600">{a.message}</div>
                    <div className="text-[11px] text-slate-400 mt-1">{timeAgo(a.created_at)}</div>
                  </div>
                  {!a.is_read && (
                    <button onClick={() => markRead(a.id)} className="text-[11px] text-blue-600 hover:text-blue-800 flex-shrink-0 mt-0.5">Mark read</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "tasks" && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Tasks — {tasks.length} total</span>
            </div>
            <div className="divide-y divide-slate-100">
              {tasks.length === 0 && <p className="text-center text-slate-400 text-[13px] py-8">No tasks</p>}
              {tasks.map((t) => (
                <div key={t.id} className="flex items-start gap-4 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[13px] font-medium text-slate-900">{t.patient_name}</span>
                      <Badge color={priorityColor(t.priority) as "red" | "amber" | "gray"}>{t.priority}</Badge>
                      <Badge color={taskStatusColor(t.status) as "green" | "blue" | "gray" | "amber"}>{t.status.replace("_", " ")}</Badge>
                    </div>
                    <div className="text-[12px] text-slate-600">{t.description}</div>
                    <div className="text-[11px] text-slate-400 mt-1">{t.task_type} · {timeAgo(t.created_at)}</div>
                    {t.assigned_to && (
                      <div className="text-[11px] text-blue-500 mt-0.5">
                        👤 {staff.find(s => s.id === t.assigned_to)?.name ?? "Assigned"}
                      </div>
                    )}
                    {(t.status === "open" || t.status === "in_progress") && (
                      <select
                        key={t.assigned_to ?? "unassigned"}
                        value={t.assigned_to ?? ""}
                        onChange={(e) => { if (e.target.value) assignTask(t.id, e.target.value); }}
                        className="mt-1.5 text-[11px] px-2 py-0.5 border border-slate-200 rounded bg-white text-slate-600 outline-none cursor-pointer"
                      >
                        <option value="" disabled>Assign to...</option>
                        {staff.filter(s => s.is_available).map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                        ))}
                      </select>
                    )}
                  </div>
                  {t.status === "open" && (
                    <button onClick={() => updateTaskStatus(t.id, "in_progress")} className="text-[11px] text-blue-600 hover:text-blue-800 flex-shrink-0 mt-0.5">Start</button>
                  )}
                  {t.status === "in_progress" && (
                    <button onClick={() => updateTaskStatus(t.id, "done")} className="text-[11px] text-green-600 hover:text-green-800 flex-shrink-0 mt-0.5">Done</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}