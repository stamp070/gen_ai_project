"use client";

import { useState } from "react";
import { mockPatients, mockStaff } from "@/lib/mock-data";
import { Patient, Staff, RiskLevel, PatientStatus } from "@/lib/types";

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

function riskBadgeColor(r: RiskLevel): "red" | "amber" | "green" | "gray" {
  return r === "critical" ? "red" : r === "high" ? "red" : r === "moderate" ? "amber" : "green";
}
function statusBadgeColor(s: PatientStatus): "red" | "amber" | "blue" | "green" {
  return s === "escalated" ? "red" : s === "critical_watch" ? "red" : s === "watch" ? "amber" : "green";
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

// ─── Vitals mini bar ──────────────────────────────────────────────────────────

function VitalBar({ label, value, min, max, warn }: { label: string; value: number; min: number; max: number; warn?: boolean }) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  return (
    <div>
      <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
        <span>{label}</span><span className={warn ? "text-red-500" : ""}>{value}</span>
      </div>
      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${warn ? "bg-red-400" : "bg-blue-400"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Patient Card ─────────────────────────────────────────────────────────────

function PatientCard({ patient, onClick, selected }: { patient: Patient; onClick: () => void; selected: boolean }) {
  return (
    <button onClick={onClick} className={`w-full text-left rounded-xl border p-4 transition-all ${selected ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-medium flex-shrink-0 ${
          patient.risk_level === "critical" ? "bg-red-100 text-red-700" : patient.risk_level === "high" ? "bg-amber-100 text-amber-700" : "bg-blue-50 text-blue-700"
        }`}>
          {initials(patient.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-slate-900 truncate">{patient.name}</div>
          <div className="text-[11px] text-slate-400">{patient.id} · Age {patient.age} · {patient.room}</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge color={riskBadgeColor(patient.risk_level)}>{patient.risk_level}</Badge>
        <Badge color={statusBadgeColor(patient.status)}>{patient.status.replace("_", " ")}</Badge>
      </div>
    </button>
  );
}

// ─── Patient Detail ───────────────────────────────────────────────────────────

function PatientDetail({ patient }: { patient: Patient }) {
  const v = patient.vitals;
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-[16px] font-medium flex-shrink-0 ${
            patient.risk_level === "critical" ? "bg-red-100 text-red-700" : patient.risk_level === "high" ? "bg-amber-100 text-amber-700" : "bg-blue-50 text-blue-700"
          }`}>
            {initials(patient.name)}
          </div>
          <div>
            <div className="text-[17px] font-medium text-slate-900">{patient.name}</div>
            <div className="text-[12px] text-slate-400 mt-0.5">{patient.id} · Age {patient.age} · Room {patient.room}</div>
            <div className="flex items-center gap-1.5 mt-2">
              <Badge color={riskBadgeColor(patient.risk_level)}>{patient.risk_level} risk</Badge>
              <Badge color={statusBadgeColor(patient.status)}>{patient.status.replace("_", " ")}</Badge>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12px] border-t border-slate-100 pt-4">
          <div className="flex justify-between"><span className="text-slate-400">Diagnosis</span><span className="text-slate-700 font-medium">{patient.diagnosis ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Admitted</span><span className="text-slate-700">{patient.admission_date ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Priority rank</span><span className="text-slate-700">#{patient.priority_rank ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Monitor every</span><span className="text-slate-700">{patient.monitoring_interval_min ?? "—"}min</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Last updated</span><span className="text-slate-400">{patient.last_updated}</span></div>
        </div>
      </div>

      {/* Vitals */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-4">Vitals</div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {[
            { label: "Heart Rate", value: v.heart_rate, unit: "bpm", warn: v.heart_rate > 100 || v.heart_rate < 50 },
            { label: "SpO2", value: v.spo2, unit: "%", warn: v.spo2 < 95 },
            { label: "Sys BP", value: v.blood_pressure_sys, unit: "mmHg", warn: v.blood_pressure_sys > 160 || v.blood_pressure_sys < 90 },
            { label: "Temperature", value: v.temperature, unit: "°C", warn: v.temperature > 38 },
            { label: "Dia BP", value: v.blood_pressure_dia, unit: "mmHg", warn: v.blood_pressure_dia > 100 },
            { label: "Resp. Rate", value: v.respiratory_rate, unit: "/min", warn: v.respiratory_rate > 20 },
          ].map((item) => (
            <div key={item.label} className={`p-3 rounded-lg border ${item.warn ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-100"}`}>
              <div className="text-[10px] text-slate-400 mb-0.5">{item.label}</div>
              <div className={`text-[18px] font-medium leading-none ${item.warn ? "text-red-600" : "text-slate-800"}`}>{item.value}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{item.unit}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2.5">
          <VitalBar label="HR" value={v.heart_rate} min={40} max={160} warn={v.heart_rate > 100} />
          <VitalBar label="SpO2" value={v.spo2} min={85} max={100} warn={v.spo2 < 95} />
          <VitalBar label="BP sys" value={v.blood_pressure_sys} min={60} max={200} warn={v.blood_pressure_sys > 160} />
        </div>
      </div>
    </div>
  );
}

// ─── Staff Card ───────────────────────────────────────────────────────────────

function StaffCard({ staff, onClick, selected }: { staff: Staff; onClick: () => void; selected: boolean }) {
  return (
    <button onClick={onClick} className={`w-full text-left rounded-xl border p-4 transition-all ${selected ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-medium flex-shrink-0 ${
          staff.role === "supervisor" ? "bg-blue-100 text-blue-700" : staff.role === "doctor" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
        }`}>
          {initials(staff.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-slate-900 truncate">{staff.name}</div>
          <div className="text-[11px] text-slate-400">{staff.ward_name ?? "Unassigned"}</div>
        </div>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${staff.is_available ? "bg-green-500" : "bg-slate-300"}`} />
      </div>
      <div className="flex items-center gap-1.5 mt-2.5">
        <Badge color={staff.role === "supervisor" ? "blue" : staff.role === "doctor" ? "green" : "gray"}>{staff.role}</Badge>
        <span className="text-[11px] text-slate-400 ml-auto">{staff.patients_assigned} patients</span>
      </div>
    </button>
  );
}

// ─── Staff Detail ─────────────────────────────────────────────────────────────

function StaffDetail({ staff }: { staff: Staff }) {
  const assignedPatients = mockPatients.filter((_, i) => i % mockStaff.indexOf(staff) === 0).slice(0, staff.patients_assigned ?? 0);
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-4 mb-5">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-[16px] font-medium flex-shrink-0 ${
          staff.role === "supervisor" ? "bg-blue-100 text-blue-700" : staff.role === "doctor" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
        }`}>
          {initials(staff.name)}
        </div>
        <div>
          <div className="text-[17px] font-medium text-slate-900">{staff.name}</div>
          <div className="text-[12px] text-slate-400 mt-0.5">{staff.id}</div>
          <div className="flex items-center gap-1.5 mt-2">
            <Badge color={staff.role === "supervisor" ? "blue" : staff.role === "doctor" ? "green" : "gray"}>{staff.role}</Badge>
            <Badge color={staff.is_available ? "green" : "gray"}>{staff.is_available ? "Available" : "Busy"}</Badge>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 text-[12px] border-t border-slate-100 pt-4">
        <div className="flex justify-between"><span className="text-slate-400">Ward</span><span className="text-slate-700">{staff.ward_name ?? "—"}</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Patients assigned</span><span className="text-slate-700">{staff.patients_assigned ?? 0}</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Status</span><span className={staff.is_available ? "text-green-600" : "text-slate-500"}>{staff.is_available ? "On duty — available" : "On duty — occupied"}</span></div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Tab = "patients" | "staff";

export default function PeoplePage() {
  const [tab, setTab] = useState<Tab>("patients");
  const [selectedPatientId, setSelectedPatientId] = useState<string>(mockPatients[0].id);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(mockStaff[0].id);
  const [searchQ, setSearchQ] = useState("");

  const filteredPatients = mockPatients.filter(
    (p) => p.name.toLowerCase().includes(searchQ.toLowerCase()) || p.id.toLowerCase().includes(searchQ.toLowerCase())
  );
  const filteredStaff = mockStaff.filter(
    (s) => s.name.toLowerCase().includes(searchQ.toLowerCase()) || s.role.toLowerCase().includes(searchQ.toLowerCase())
  );

  const selectedPatient = mockPatients.find((p) => p.id === selectedPatientId)!;
  const selectedStaff = mockStaff.find((s) => s.id === selectedStaffId)!;

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-5">
      <div className="max-w-[1160px] mx-auto flex flex-col gap-4">

        {/* Header */}
        <header className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-700 rounded-lg flex items-center justify-center text-blue-50 text-[15px] font-medium">B</div>
            <div>
              <div className="text-[15px] font-medium text-slate-900 leading-none">People</div>
              <div className="text-xs text-slate-400 mt-1">Patients and clinical staff</div>
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search name, ID..."
              className="pl-8 pr-4 py-1.5 text-[13px] border border-slate-200 rounded-lg bg-slate-50 text-slate-700 outline-none focus:ring-2 ring-blue-200 w-52"
            />
          </div>
        </header>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-2">
          {[
            { key: "patients" as Tab, label: "Patients", count: mockPatients.length },
            { key: "staff" as Tab,    label: "Staff",    count: mockStaff.length },
          ].map((t) => (
            <button key={t.key} onClick={() => { setTab(t.key); setSearchQ(""); }}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-[13px] font-medium transition-colors ${tab === t.key ? "bg-blue-700 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
              {t.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-blue-600 text-blue-100" : "bg-slate-100 text-slate-500"}`}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* Content — master-detail */}
        {tab === "patients" && (
          <div className="grid grid-cols-[320px_1fr] gap-4 items-start">
            {/* List */}
            <div className="flex flex-col gap-2">
              {filteredPatients.length === 0 && <div className="py-10 text-center text-[13px] text-slate-400">No patients found</div>}
              {filteredPatients.map((p) => (
                <PatientCard key={p.id} patient={p} selected={selectedPatientId === p.id} onClick={() => setSelectedPatientId(p.id)} />
              ))}
            </div>
            {/* Detail */}
            <PatientDetail patient={selectedPatient} />
          </div>
        )}

        {tab === "staff" && (
          <div className="grid grid-cols-[320px_1fr] gap-4 items-start">
            {/* List */}
            <div className="flex flex-col gap-2">
              {filteredStaff.length === 0 && <div className="py-10 text-center text-[13px] text-slate-400">No staff found</div>}
              {filteredStaff.map((s) => (
                <StaffCard key={s.id} staff={s} selected={selectedStaffId === s.id} onClick={() => setSelectedStaffId(s.id)} />
              ))}
            </div>
            {/* Detail */}
            <StaffDetail staff={selectedStaff} />
          </div>
        )}

      </div>
    </div>
  );
}
