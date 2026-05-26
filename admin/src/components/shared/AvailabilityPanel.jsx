/**
 * AvailabilityPanel.jsx (Shared)
 * Reusable availability settings panel used by both DoctorEditPage and ServiceEditPage.
 *
 * Props:
 *   sessionMode         {string}   - "Morning" | "Afternoon" | "Both"
 *   setSessionMode      {fn}
 *   weeklyDays          {string[]} - e.g. ["Monday", "Wednesday"]
 *   setWeeklyDays       {fn}
 *   blockedDates        {string[]} - ISO date strings e.g. ["2025-12-25"]
 *   setBlockedDates     {fn}
 *   saving              {boolean}
 *   onSave              {fn}       - async save handler
 */
import React, { useState } from "react";
import { Calendar, Save, X, Plus, ShieldCheck } from "lucide-react";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function AvailabilityPanel({
  sessionMode,
  setSessionMode,
  weeklyDays,
  setWeeklyDays,
  blockedDates,
  setBlockedDates,
  saving,
  onSave,
}) {
  const [newBlockDate, setNewBlockDate] = useState("");

  const toggleDay = (day) =>
    setWeeklyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );

  const addBlockDate = () => {
    if (!newBlockDate || blockedDates.includes(newBlockDate)) return;
    setBlockedDates((prev) => [...prev, newBlockDate].sort());
    setNewBlockDate("");
  };

  const removeBlockDate = (d) =>
    setBlockedDates((prev) => prev.filter((x) => x !== d));

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Panel header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
        <ShieldCheck className="w-5 h-5 text-blue-500" />
        <h2 className="font-bold text-slate-800 text-base">
          Availability Settings
        </h2>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left — Session preference + weekly days */}
        <div className="space-y-5">
          {/* Session preference */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Session Preference
            </label>
            <select
              value={sessionMode}
              onChange={(e) => setSessionMode(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
            >
              <option value="Morning">Morning Only (9:30 AM – 1:30 PM)</option>
              <option value="Afternoon">
                Afternoon Only (2:30 PM – 5:30 PM)
              </option>
              <option value="Both">Both Sessions (Full Day)</option>
            </select>
          </div>

          {/* Weekly days */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Weekly Availability
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DAYS.map((day) => {
                const active = weeklyDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                      active
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        active ? "bg-white" : "bg-slate-300"
                      }`}
                    />
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right — Blocked dates */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Blocked Dates
          </label>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={newBlockDate}
                onChange={(e) => setNewBlockDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <button
              type="button"
              onClick={addBlockDate}
              disabled={!newBlockDate}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-semibold transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Block
            </button>
          </div>

          {/* Blocked dates list */}
          <div className="min-h-[80px] max-h-48 overflow-y-auto space-y-1.5 rounded-xl border border-slate-100 bg-slate-50 p-3">
            {blockedDates.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                No dates blocked
              </p>
            ) : (
              blockedDates.map((d) => (
                <div
                  key={d}
                  className="flex items-center justify-between bg-white rounded-lg px-3 py-1.5 border border-slate-100 text-xs"
                >
                  <span className="text-slate-700 font-medium">{d}</span>
                  <button
                    type="button"
                    onClick={() => removeBlockDate(d)}
                    className="text-rose-400 hover:text-rose-600 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="px-6 pb-6 pt-0">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm transition cursor-pointer shadow-sm"
        >
          {saving ? (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? "Saving…" : "Save Availability Settings"}
        </button>
      </div>
    </section>
  );
}
