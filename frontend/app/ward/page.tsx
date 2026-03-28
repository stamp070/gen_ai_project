"use client";

import { useState } from "react";
import { mockPatients, mockWards, mockAlerts, mockTasks, mockWardState, mockStaff } from "@/lib/mock-data";
import { Patient, Alert, Task, Ward } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function riskColor(r: string) {
  return r === "critical" ? "red" : r === "high" ? "red" : r === "moderate" ? "amber" : "green";
}

function priorityColor(p: string) {
  return p === "critical" ? "red" : p === "urgent" ? "amber" : "gray";
}

function taskStatusColor(s: string) {
  return s === "done" ? "green" : s === "in_progress" ? "blue" : s === "cancelled" ? "gray" : "amber";
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

// ─── Sub sections ─────────────────────────────────────────────────────────────

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
              <Badge color={pct >= 90 ? "red" : pct >= 70 ? "amber" : "green"}>
                {pct}% full
              </Badge>
            </div>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-[28px] font-medium text-slate-900 leading-none">{w.current_patients}</span>
              <span className="text-[13px] text-slate-400">/ {w.capacity} beds</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PriorityQueue({ patients, onReorder }: { patients: Patient[]; onReorder: (id: string, dir: "up" | "down") => void }) {
  const sorted = [...patients].sort((a, b) => (a.priority_rank ?? 5) - (b.priority_rank ?? 5));
  return (
    <div className="flex flex-col gap-2">
      {sorted.map((p, idx) => (
        <div key={p.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 group hover:border-slate-300 transition-colors">
          {/* Rank */}
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-medium flex-shrink-0 ${
            idx === 0 ? "bg-red-600 text-white" : idx === 1 ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-500"
          }`}>
            {idx + 1}
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-slate-900">{p.name}</span>
              <Badge color={riskColor(p.risk_level) as "red" | "amber" | "green"}>{p.risk_level}</Badge>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">{p.room} · {p.diagnosis ?? "—"} · {p.monitoring_interval_min}min monitor</div>
          </div>
          {/* Controls */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onReorder(p.id, "up")} disabled={idx === 0}
              className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 disabled:opacity-20 transition-colors">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 8V2M2 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button onClick={() => onReorder(p.id, "down")} disabled={idx === sorted.length - 1}
              className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 disabled:opacity-20 transition-colors">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2v6M8 5L5 8 2 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AlertList({ alerts, onRead }: { alerts: Alert[]; onRead: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {alerts.map((a) => (
        <div key={a.id} className={`flex items-start gap-3 rounded-xl px-4 py-3 border transition-opacity ${a.is_read ? "opacity-50 bg-white border-slate-100" : "bg-white border-slate-200"}`}>
          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.priority === "critical" ? "bg-red-500" : a.priority === "urgent" ? "bg-amber-500" : "bg-slate-300"}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] font-medium text-slate-800">{a.patient_name}</span>
              <Badge color={priorityColor(a.priority) as "red" | "amber" | "gray"}>{a.priority}</Badge>
              <span className="text-[11px] text-slate-400 ml-auto">{timeAgo(a.created_at)}</span>
            </div>
            <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">{a.message}</p>
          </div>
          {!a.is_read && (
            <button onClick={() => onRead(a.id)} className="text-[11px] text-blue-600 hover:text-blue-800 flex-shrink-0 mt-0.5">Mark read</button>
          )}
        </div>
      ))}
    </div>
  );
}

function TaskBoard({ tasks }: { tasks: Task[] }) {
  const cols: { key: Task["status"]; label: string }[] = [
    { key: "open", label: "Open" },
    { key: "in_progress", label: "In Progress" },
    { key: "done", label: "Done" },
  ];
  return (
    <div className="grid grid-cols-3 gap-4">
      {cols.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.key);
        return (
          <div key={col.key} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{col.label}</span>
              <span className="text-[11px] text-slate-400">{colTasks.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {colTasks.length === 0 && <div className="py-6 text-center text-[12px] text-slate-300 italic">Empty</div>}
              {colTasks.map((t) => (
                <div key={t.id} className="bg-white border border-slate-200 rounded-lg p-3">
                  <div className="flex items-start gap-2 mb-1.5">
                    <Badge color={priorityColor(t.priority) as "red" | "amber" | "gray"}>{t.priority}</Badge>
                    <span className="text-[11px] text-slate-400 ml-auto">{timeAgo(t.created_at)}</span>
                  </div>
                  <p className="text-[12px] text-slate-700 leading-snug mb-1.5">{t.description}</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-blue-50 flex items-center justify-center text-[8px] text-blue-700 font-medium">
                      {t.patient_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <span className="text-[11px] text-slate-400">{t.patient_name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Tab = "overview" | "priority" | "alerts" | "tasks";

export default function WardPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [patients, setPatients] = useState<Patient[]>(mockPatients);
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const tasks = mockTasks;
  const ward = mockWardState;

  const reorder = (id: string, dir: "up" | "down") => {
    setPatients((prev) => {
      const sorted = [...prev].sort((a, b) => (a.priority_rank ?? 5) - (b.priority_rank ?? 5));
      const idx = sorted.findIndex((p) => p.id === id);
      const swapIdx = dir === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return prev;
      const a = sorted[idx].priority_rank ?? idx + 1;
      const b = sorted[swapIdx].priority_rank ?? swapIdx + 1;
      return prev.map((p) => {
        if (p.id === id) return { ...p, priority_rank: b };
        if (p.id === sorted[swapIdx].id) return { ...p, priority_rank: a };
        return p;
      });
    });
  };

  const markRead = (id: string) => setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, is_read: true } : a));
  const unreadCount = alerts.filter((a) => !a.is_read).length;

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "priority", label: "Priority Queue", count: patients.length },
    { key: "alerts",   label: "Alerts",         count: unreadCount || undefined },
    { key: "tasks",    label: "Tasks",           count: tasks.filter(t => t.status === "open").length },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-5">
      <div className="max-w-[1160px] mx-auto flex flex-col gap-4">

        {/* Header */}
        <header className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-700 rounded-lg flex items-center justify-center text-blue-50 text-[15px] font-medium">B</div>
            <div>
              <div className="text-[15px] font-medium text-slate-900 leading-none">Ward Management</div>
              <div className="text-xs text-slate-400 mt-1">Priority, alerts, and task board</div>
            </div>
          </div>
          {/* Quick stats */}
          <div className="flex items-center gap-5 text-right">
            {[
              { label: "Patients", val: ward.total_patients },
              { label: "Nurses", val: ward.available_nurses },
              { label: "Doctors", val: ward.available_doctors },
              { label: "Alerts", val: unreadCount, warn: true },
            ].map((s) => (
              <div key={s.label}>
                <div className={`text-[18px] font-medium leading-none ${s.warn && unreadCount > 0 ? "text-red-600" : "text-slate-900"}`}>{s.val}</div>
                <div className="text-[11px] text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>
        </header>

        {/* Tabs */}
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

        {/* Content */}
        {tab === "overview" && (
          <div className="flex flex-col gap-4">
            <WardCards wards={mockWards} />
            {/* Staff availability */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Staff on duty</span>
              </div>
              <div className="divide-y divide-slate-100">
                {mockStaff.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 text-[11px] font-medium flex-shrink-0">
                      {s.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-medium text-slate-800">{s.name}</div>
                      <div className="text-[11px] text-slate-400">{s.ward_name} · {s.patients_assigned} patients</div>
                    </div>
                    <Badge color={s.role === "supervisor" ? "blue" : "gray"}>{s.role}</Badge>
                    <div className={`w-2 h-2 rounded-full ${s.is_available ? "bg-green-500" : "bg-slate-300"}`} title={s.is_available ? "Available" : "Busy"} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "priority" && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Patient priority queue</span>
              <span className="text-[11px] text-slate-400">Drag or use arrows to reorder</span>
            </div>
            <div className="p-4">
              <PriorityQueue patients={patients} onReorder={reorder} />
            </div>
          </div>
        )}

        {tab === "alerts" && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Alerts</span>
              {unreadCount > 0 && <Badge color="red">{unreadCount} unread</Badge>}
            </div>
            <div className="p-4">
              <AlertList alerts={alerts} onRead={markRead} />
            </div>
          </div>
        )}

        {tab === "tasks" && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Task board</span>
            </div>
            <div className="p-4">
              <TaskBoard tasks={tasks} />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
