/**
 * EmergencyClosurePanel.jsx (Shared)
 * Reusable emergency closure panel used by both DoctorEditPage and ServiceEditPage.
 *
 * Props:
 *   entityName          {string}   - e.g. "Dr. Smith" or "MRI Scan"
 *   absenceDate         {string}
 *   setAbsenceDate      {fn}
 *   absenceSession      {string}
 *   setAbsenceSession   {fn}
 *   triggering          {boolean}
 *   onTrigger           {fn}       - async trigger handler
 */
import React from "react";
import { AlertTriangle, Zap } from "lucide-react";

export default function EmergencyClosurePanel({
  entityName,
  absenceDate,
  setAbsenceDate,
  absenceSession,
  setAbsenceSession,
  triggering,
  onTrigger,
}) {
  return (
    <section className="bg-white rounded-2xl border border-rose-200 shadow-sm overflow-hidden">
      {/* Panel header */}
      <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex items-center gap-2.5">
        <AlertTriangle className="w-5 h-5 text-rose-500" />
        <h2 className="font-bold text-rose-800 text-base">
          Emergency Absence / Closure
        </h2>
      </div>

      <div className="p-6 space-y-4">
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 leading-relaxed">
          Triggering closure instantly blocks the selected date/session and
          automatically reschedules all affected bookings for{" "}
          <strong>{entityName}</strong> forward in sequential order.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Date picker */}
          <div>
            <label className="block text-xs font-semibold text-rose-700 uppercase tracking-wide mb-2">
              Select Date
            </label>
            <input
              type="date"
              value={absenceDate}
              onChange={(e) => setAbsenceDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-rose-200 bg-white text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
            />
          </div>

          {/* Session picker */}
          <div>
            <label className="block text-xs font-semibold text-rose-700 uppercase tracking-wide mb-2">
              Select Session
            </label>
            <select
              value={absenceSession}
              onChange={(e) => setAbsenceSession(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-rose-200 bg-white text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 cursor-pointer"
            >
              <option value="Morning">Morning Only (9:30 AM – 1:30 PM)</option>
              <option value="Afternoon">
                Afternoon Only (2:30 PM – 5:30 PM)
              </option>
              <option value="Both">Both Sessions (Full Day)</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={onTrigger}
          disabled={triggering || !absenceDate}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-sm transition cursor-pointer shadow-sm uppercase tracking-wider"
        >
          {triggering ? (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          {triggering ? "Processing…" : "Trigger Emergency Closure"}
        </button>
      </div>
    </section>
  );
}
