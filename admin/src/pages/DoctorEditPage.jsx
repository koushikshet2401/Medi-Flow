import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Save, AlertTriangle, Calendar, Clock, Shield,
  User, MapPin, Star, CheckCircle, XCircle, Stethoscope, Loader2
} from "lucide-react";

const API_BASE =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:4000"
    : "https://medi-flow-backend.onrender.com";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const SESSION_SLOTS = {
  Morning:   ["9:30 AM–10:30 AM","10:30 AM–11:30 AM","11:30 AM–12:30 PM","12:30 PM–1:30 PM"],
  Afternoon: ["2:30 PM–3:30 PM","3:30 PM–4:30 PM","4:30 PM–5:30 PM"],
};

export default function DoctorEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [doctor, setDoctor]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null); // { msg, type }

  // Availability form state
  const [sessionMode, setSessionMode]   = useState("Both");
  const [weeklyDays, setWeeklyDays]     = useState(["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [newBlockDate, setNewBlockDate] = useState("");

  // Emergency absence
  const [absenceDate, setAbsenceDate]       = useState("");
  const [absenceSession, setAbsenceSession] = useState("Both");
  const [triggeringAbsence, setTriggeringAbsence] = useState(false);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Fetch doctor ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API_BASE}/api/doctors/${id}`)
      .then(r => r.json())
      .then(payload => {
        const doc = payload?.data || payload?.doctor || null;
        if (!doc) { showToast("Doctor not found", "error"); return; }
        setDoctor(doc);
        const s = doc.availabilitySettings || {};
        setSessionMode(s.sessions || s.sessionMode || "Both");
        setWeeklyDays(s.weeklyDays?.length ? s.weeklyDays : ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]);
        setBlockedDates(Array.isArray(s.blockedDates) ? s.blockedDates : []);
      })
      .catch(() => showToast("Failed to load doctor", "error"))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toggleDay = (day) =>
    setWeeklyDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

  const addBlockDate = () => {
    if (!newBlockDate || blockedDates.includes(newBlockDate)) return;
    setBlockedDates(prev => [...prev, newBlockDate].sort());
    setNewBlockDate("");
  };

  // ── Save availability settings ────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/doctors/${id}/admin-update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availabilitySettings: {
            sessionMode,
            sessions: sessionMode,
            weeklyDays,
            blockedDates,
          },
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast("Availability settings saved successfully!", "success");
        setDoctor(body.data || doctor);
      } else {
        showToast(body?.message || "Failed to save settings", "error");
      }
    } catch {
      showToast("Network error — please try again", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Trigger emergency absence ─────────────────────────────────────────────
  const handleAbsence = async () => {
    if (!absenceDate) { showToast("Please select a date", "error"); return; }
    const confirmed = window.confirm(
      `Trigger Emergency Closure for Dr. ${doctor?.name} on ${absenceDate} (${absenceSession} session)?\n\nThis will automatically reschedule all affected appointments forward.`
    );
    if (!confirmed) return;

    setTriggeringAbsence(true);
    try {
      const res = await fetch(`${API_BASE}/api/doctors/${id}/admin-absence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: absenceDate, session: absenceSession }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(
          `Emergency closure registered! ${body?.affectedAppointmentsCount ?? 0} appointment(s) rescheduled.`,
          "success"
        );
        setAbsenceDate("");
        // Also add to blocked dates locally
        if (!blockedDates.includes(absenceDate))
          setBlockedDates(prev => [...prev, absenceDate].sort());
      } else {
        showToast(body?.message || "Failed to register closure", "error");
      }
    } catch {
      showToast("Network error — please try again", "error");
    } finally {
      setTriggeringAbsence(false);
    }
  };

  // ── Render states ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          <p className="font-medium text-sm">Loading doctor profile…</p>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <p className="text-slate-600 font-semibold mb-4">Doctor not found.</p>
          <button onClick={() => navigate("/list")} className="text-blue-600 hover:underline text-sm">
            ← Back to Doctor List
          </button>
        </div>
      </div>
    );
  }

  const isAvailable = doctor.availability === "Available";
  const previewSlots = SESSION_SLOTS[sessionMode] ?? [...SESSION_SLOTS.Morning, ...SESSION_SLOTS.Afternoon];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">

      {/* ─── Toast ────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold text-white transition-all duration-300 ${toast.type === "success" ? "bg-emerald-500" : "bg-rose-500"}`}>
          {toast.type === "success" ? <CheckCircle className="w-4.5 h-4.5" /> : <XCircle className="w-4.5 h-4.5" />}
          {toast.msg}
        </div>
      )}

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/70 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate("/list")}
            className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Doctor List
          </button>
          <h1 className="text-slate-800 font-bold text-base sm:text-lg truncate">
            Manage — <span className="text-blue-600">Dr. {doctor.name}</span>
          </h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-xl shadow-md transition-all"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ─── Doctor Profile Card ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6 flex flex-col sm:flex-row gap-5 items-start">
          <div className="relative flex-shrink-0">
            <img
              src={doctor.imageUrl || doctor.image || "/placeholder-doctor.jpg"}
              alt={doctor.name}
              className="w-24 h-24 rounded-2xl object-cover shadow-md border-2 border-blue-100"
            />
            <span className={`absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full border-2 border-white shadow-sm ${isAvailable ? "bg-emerald-400" : "bg-rose-400"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-slate-800">{doctor.name}</h2>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${isAvailable ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"}`}>
                {isAvailable ? "Available" : "Unavailable"}
              </span>
            </div>
            <p className="text-blue-600 font-medium text-sm mb-2">{doctor.specialization || doctor.speciality}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Stethoscope className="w-3 h-3" /> {doctor.experience} yrs experience</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {doctor.location}</span>
              <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {doctor.rating}</span>
              <span className="flex items-center gap-1"><User className="w-3 h-3" /> {doctor.patients} patients</span>
            </div>
            {doctor.about && <p className="mt-2 text-xs text-slate-500 line-clamp-2">{doctor.about}</p>}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-black text-slate-800">₹{doctor.fee}</p>
            <p className="text-xs text-slate-400">per consultation</p>
          </div>
        </div>

        {/* ─── Main Grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT: Session + Slot Preview ─────────────────────────── */}
          <div className="space-y-5">

            {/* Session preference */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Session Preference</h3>
              </div>
              <div className="space-y-2">
                {[
                  { v: "Morning",   label: "Morning Only",    sub: "9:30 AM – 1:30 PM (4 slots)" },
                  { v: "Afternoon", label: "Afternoon Only",  sub: "2:30 PM – 5:30 PM (3 slots)" },
                  { v: "Both",      label: "Both Sessions",   sub: "9:30 AM – 5:30 PM (7 slots)" },
                ].map(opt => (
                  <label key={opt.v} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${sessionMode === opt.v ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-blue-200"}`}>
                    <input
                      type="radio"
                      name="session"
                      value={opt.v}
                      checked={sessionMode === opt.v}
                      onChange={() => setSessionMode(opt.v)}
                      className="mt-0.5 text-blue-600 accent-blue-600"
                    />
                    <div>
                      <p className={`text-sm font-semibold ${sessionMode === opt.v ? "text-blue-700" : "text-slate-700"}`}>{opt.label}</p>
                      <p className="text-xs text-slate-500">{opt.sub}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Slot preview */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Generated Slots Preview</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {previewSlots.map(s => (
                  <span key={s} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg font-medium border border-indigo-100">
                    {s}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-3">These slots are auto-generated on every available date.</p>
            </div>
          </div>

          {/* ── MIDDLE: Weekly Days + Blocked Dates ──────────────────── */}
          <div className="space-y-5">

            {/* Weekly availability */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Weekly Availability</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DAYS.map(day => {
                  const active = weeklyDays.includes(day);
                  return (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${active ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-500 hover:border-emerald-200"}`}
                    >
                      <span className={`w-3 h-3 rounded-full flex-shrink-0 ${active ? "bg-emerald-400" : "bg-slate-300"}`} />
                      {day.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 mt-3">{weeklyDays.length} of 7 days active</p>
            </div>

            {/* Blocked dates */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Blocked Dates</h3>
              </div>
              <div className="flex gap-2 mb-3">
                <input
                  type="date"
                  value={newBlockDate}
                  onChange={e => setNewBlockDate(e.target.value)}
                  className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-slate-50"
                />
                <button
                  onClick={addBlockDate}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
                >
                  Block
                </button>
              </div>
              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                {blockedDates.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No dates blocked</p>
                ) : (
                  blockedDates.map(d => (
                    <div key={d} className="flex items-center justify-between bg-amber-50 border border-amber-100 px-3 py-2 rounded-xl">
                      <span className="text-sm text-amber-800 font-medium">{d}</span>
                      <button
                        onClick={() => setBlockedDates(prev => prev.filter(x => x !== d))}
                        className="text-rose-400 hover:text-rose-600 text-lg leading-none font-bold transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Emergency Absence ──────────────────────────────── */}
          <div>
            <div className="bg-rose-50 border border-rose-200 rounded-2xl shadow-sm p-5 h-full">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                </div>
                <h3 className="font-bold text-rose-800 text-sm">Emergency Absence</h3>
              </div>

              <p className="text-xs text-rose-600 mb-5 leading-relaxed">
                Triggers an immediate closure for the selected date and session.
                All affected patient appointments are <strong>automatically rescheduled forward</strong> in booking order — patients will see a notification in their app.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-rose-700 mb-1.5">Closure Date</label>
                  <input
                    type="date"
                    value={absenceDate}
                    onChange={e => setAbsenceDate(e.target.value)}
                    className="w-full text-sm border border-rose-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-rose-700 mb-1.5">Session to Close</label>
                  <select
                    value={absenceSession}
                    onChange={e => setAbsenceSession(e.target.value)}
                    className="w-full text-sm border border-rose-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
                  >
                    <option value="Morning">Morning Only (9:30 AM – 1:30 PM)</option>
                    <option value="Afternoon">Afternoon Only (2:30 PM – 5:30 PM)</option>
                    <option value="Both">Both Sessions (Full Day)</option>
                  </select>
                </div>

                <button
                  onClick={handleAbsence}
                  disabled={triggeringAbsence || !absenceDate}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {triggeringAbsence
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                    : <><AlertTriangle className="w-4 h-4" /> Trigger Emergency Closure</>
                  }
                </button>

                {blockedDates.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-rose-200">
                    <p className="text-xs font-bold text-rose-700 mb-2">Currently Blocked ({blockedDates.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {blockedDates.slice(0, 6).map(d => (
                        <span key={d} className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-lg font-medium">{d}</span>
                      ))}
                      {blockedDates.length > 6 && <span className="text-[10px] text-rose-400">+{blockedDates.length - 6} more</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Save footer ───────────────────────────────────────────────── */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2.5 px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-2xl shadow-lg transition-all text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving Changes…" : "Save Availability Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
