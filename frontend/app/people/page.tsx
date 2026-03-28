"use client";

import { useState, useEffect } from "react";
import { Patient, Staff, RiskLevel, PatientStatus } from "@/lib/types";

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

function riskBadgeColor(r: RiskLevel): "red" | "amber" | "green" | "gray" {
  return r === "critical" ? "red" : r === "high" ? "red" : r === "moderate" ? "amber" : "green";
}
function statusBadgeColor(s: PatientStatus): "red" | "amber" | "blue" | "green" {
  return s === "escalated" ? "red" : s === "critical_watch" ? "red" : s === "watch" ? "amber" : "green";
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

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
        <Badge color={riskBadgeColor(patient.risk_level)}>{patient.risk_level}</Badge>
      </div>
      {patient.diagnosis && <div className="text-[11px] text-slate-500 mb-2">{patient.diagnosis}</div>}
      <div className="flex gap-2 flex-wrap">
        <Badge color={statusBadgeColor(patient.status)}>{patient.status.replace("_", " ")}</Badge>
        {patient.monitoring_interval_min && <Badge color="gray">Every {patient.monitoring_interval_min}m</Badge>}
      </div>
    </button>
  );
}

function StaffCard({ staff, onClick, selected }: { staff: Staff; onClick: () => void; selected: boolean }) {
  const roleColor = staff.role === "doctor" ? "bg-blue-50 text-blue-700" : staff.role === "supervisor" ? "bg-purple-50 text-purple-700" : "bg-teal-50 text-teal-700";
  return (
    <button onClick={onClick} className={`w-full text-left rounded-xl border p-4 transition-all ${selected ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-medium flex-shrink-0 ${roleColor}`}>
          {initials(staff.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-slate-900 truncate">{staff.name}</div>
          <div className="text-[11px] text-slate-400">{staff.ward_name ?? "—"}</div>
        </div>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${staff.is_available ? "bg-green-500" : "bg-slate-300"}`} />
      </div>
      <div className="flex gap-2 mt-3">
        <Badge color="gray">{staff.role}</Badge>
        <Badge color={staff.is_available ? "green" : "gray"}>{staff.is_available ? "Available" : "Busy"}</Badge>
        {staff.patients_assigned != null && <Badge color="gray">{staff.patients_assigned} patients</Badge>}
      </div>
    </button>
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

function mapApiStaff(s: Record<string, unknown>): Staff {
  return {
    id: s.id as string,
    name: s.name as string,
    role: (s.role as Staff["role"]) ?? "nurse",
    is_available: (s.is_available as boolean) ?? false,
    ward_name: (s.ward_name as string) ?? undefined,
    patients_assigned: s.patients_assigned as number | undefined,
  };
}

type Tab = "patients" | "staff";

export default function PeoplePage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("patients");
  const [search, setSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/patients`).then((r) => r.ok ? r.json() : []),
      fetch(`${API_BASE}/staff`).then((r) => r.ok ? r.json() : []),
    ]).then(([pData, sData]) => {
      const mapped = pData.map(mapApiPatient);
      const mappedStaff = sData.map(mapApiStaff);
      setPatients(mapped);
      setStaff(mappedStaff);
      if (mapped.length > 0) setSelectedPatientId(mapped[0].id);
      if (mappedStaff.length > 0) setSelectedStaffId(mappedStaff[0].id);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filteredPatients = patients.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase())
  );
  const filteredStaff = staff.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.role.toLowerCase().includes(search.toLowerCase())
  );

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);
  const selectedStaff = staff.find((s) => s.id === selectedStaffId);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-slate-400 text-[14px]">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-5">
      <div className="max-w-[1160px] mx-auto flex flex-col gap-4">

        <header className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-700 rounded-lg flex items-center justify-center text-blue-50 text-[15px] font-medium">B</div>
            <div>
              <div className="text-[15px] font-medium text-slate-900 leading-none">People</div>
              <div className="text-xs text-slate-400 mt-1">Patients &amp; staff directory</div>
            </div>
          </div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or ID..." className="text-[13px] px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 outline-none w-52" />
        </header>

        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-2">
          {([
            { key: "patients" as Tab, label: "Patients", count: patients.length },
            { key: "staff" as Tab,    label: "Staff",    count: staff.length },
          ]).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${tab === t.key ? "bg-blue-700 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
              {t.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-blue-600 text-blue-100" : "bg-slate-100 text-slate-500"}`}>{t.count}</span>
            </button>
          ))}
        </div>

        {tab === "patients" && (
          <div className="grid grid-cols-[320px_1fr] gap-4">
            <div className="flex flex-col gap-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
              {filteredPatients.length === 0
                ? <p className="text-center text-slate-400 text-[13px] py-8">No patients found</p>
                : filteredPatients.map((p) => (
                  <PatientCard key={p.id} patient={p} onClick={() => setSelectedPatientId(p.id)} selected={selectedPatientId === p.id} />
                ))}
            </div>
            {selectedPatient ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-[18px] font-medium ${
                      selectedPatient.risk_level === "critical" ? "bg-red-100 text-red-700" : selectedPatient.risk_level === "high" ? "bg-amber-100 text-amber-700" : "bg-blue-50 text-blue-700"
                    }`}>{initials(selectedPatient.name)}</div>
                    <div>
                      <div className="text-[18px] font-medium text-slate-900">{selectedPatient.name}</div>
                      <div className="text-[13px] text-slate-400 mt-0.5">{selectedPatient.id} · Age {selectedPatient.age} · Room {selectedPatient.room}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge color={riskBadgeColor(selectedPatient.risk_level)}>{selectedPatient.risk_level}</Badge>
                    <Badge color={statusBadgeColor(selectedPatient.status)}>{selectedPatient.status.replace("_", " ")}</Badge>
                  </div>
                </div>
                {selectedPatient.diagnosis && (
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Diagnosis</div>
                    <div className="text-[14px] text-slate-700">{selectedPatient.diagnosis}</div>
                  </div>
                )}
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-3">Latest vitals</div>
                  <div className="grid grid-cols-2 gap-3">
                    <VitalBar label="Heart rate (bpm)" value={selectedPatient.vitals.heart_rate} min={40} max={160} warn={selectedPatient.vitals.heart_rate > 100 || selectedPatient.vitals.heart_rate < 50} />
                    <VitalBar label="SpO2 (%)" value={selectedPatient.vitals.spo2} min={85} max={100} warn={selectedPatient.vitals.spo2 < 95} />
                    <VitalBar label="Systolic BP (mmHg)" value={selectedPatient.vitals.blood_pressure_sys} min={80} max={200} warn={selectedPatient.vitals.blood_pressure_sys > 160 || selectedPatient.vitals.blood_pressure_sys < 90} />
                    <VitalBar label="Temperature (°C)" value={selectedPatient.vitals.temperature} min={35} max={41} warn={selectedPatient.vitals.temperature > 38} />
                    <VitalBar label="Resp. rate (/min)" value={selectedPatient.vitals.respiratory_rate} min={8} max={40} warn={selectedPatient.vitals.respiratory_rate > 20} />
                  </div>
                </div>
                {selectedPatient.admission_date && (
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Admitted</div>
                    <div className="text-[13px] text-slate-700">{selectedPatient.admission_date}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-[13px]">Select a patient</div>
            )}
          </div>
        )}

        {tab === "staff" && (
          <div className="grid grid-cols-[320px_1fr] gap-4">
            <div className="flex flex-col gap-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
              {filteredStaff.length === 0
                ? <p className="text-center text-slate-400 text-[13px] py-8">No staff found</p>
                : filteredStaff.map((s) => (
                  <StaffCard key={s.id} staff={s} onClick={() => setSelectedStaffId(s.id)} selected={selectedStaffId === s.id} />
                ))}
            </div>
            {selectedStaff ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 text-[18px] font-medium">{initials(selectedStaff.name)}</div>
                    <div>
                      <div className="text-[18px] font-medium text-slate-900">{selectedStaff.name}</div>
                      <div className="text-[13px] text-slate-400 mt-0.5">{selectedStaff.role} · {selectedStaff.ward_name ?? "Unassigned"}</div>
                    </div>
                  </div>
                  <Badge color={selectedStaff.is_available ? "green" : "gray"}>{selectedStaff.is_available ? "Available" : "Busy"}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Role</div>
                    <div className="text-[16px] font-medium text-slate-900 capitalize">{selectedStaff.role}</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Patients assigned</div>
                    <div className="text-[16px] font-medium text-slate-900">{selectedStaff.patients_assigned ?? "—"}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-[13px]">Select a staff member</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
