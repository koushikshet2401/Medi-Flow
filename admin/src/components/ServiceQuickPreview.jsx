/**
 * ServiceQuickPreview.jsx
 * Lightweight dropdown preview for the service list card.
 * Shows ONLY: About, Instructions, Weekly availability, Price, Slots, Status.
 * Admin controls are intentionally excluded — they live in ServiceEditPage.
 */
import React from "react";
import { Info, ListChecks, CalendarCheck, DollarSign, Layers, CheckCircle, XCircle } from "lucide-react";

const DAYS_SHORT = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

export default function ServiceQuickPreview({ service }) {
  const raw = service._raw || {};
  const weeklyDays =
    raw.availabilitySettings?.weeklyDays ||
    raw.weeklyDays ||
    [];
  const instructions =
    Array.isArray(service.instructions) ? service.instructions : [];

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ── Left column: About + Instructions + Availability ── */}
        <div className="space-y-4">
          {/* About */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Info className="w-3.5 h-3.5 text-sky-500" />
              <span className="text-xs font-bold text-sky-700 uppercase tracking-wide">
                About
              </span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {service.about || (
                <span className="text-slate-400 italic">No description.</span>
              )}
            </p>
          </div>

          {/* Instructions */}
          {instructions.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <ListChecks className="w-3.5 h-3.5 text-sky-500" />
                <span className="text-xs font-bold text-sky-700 uppercase tracking-wide">
                  Instructions
                </span>
              </div>
              <ul className="space-y-1">
                {instructions.slice(0, 4).map((inst, i) => (
                  <li
                    key={i}
                    className="text-sm text-slate-600 flex items-start gap-2"
                  >
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" />
                    {inst}
                  </li>
                ))}
                {instructions.length > 4 && (
                  <li className="text-xs text-slate-400 italic pl-3.5">
                    +{instructions.length - 4} more…
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Weekly availability */}
          {weeklyDays.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <CalendarCheck className="w-3.5 h-3.5 text-sky-500" />
                <span className="text-xs font-bold text-sky-700 uppercase tracking-wide">
                  Available on
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map((d) => {
                  const active = weeklyDays.includes(d);
                  return (
                    <span
                      key={d}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        active
                          ? "bg-sky-100 text-sky-700 border border-sky-200"
                          : "bg-slate-100 text-slate-400 border border-slate-200 opacity-50"
                      }`}
                    >
                      {DAYS_SHORT[d]}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Right column: Price, Slots, Status ── */}
        <div className="space-y-3">
          {/* Price */}
          <div className="bg-sky-50 border border-sky-100 rounded-xl px-4 py-3 flex items-center gap-3">
            <DollarSign className="w-4 h-4 text-sky-500" />
            <div>
              <p className="text-xs text-sky-500 font-medium">Price</p>
              <p className="text-lg font-bold text-sky-700">
                ₹{service.price ?? 0}
              </p>
            </div>
          </div>

          {/* Slots count */}
          <div className="bg-sky-50 border border-sky-100 rounded-xl px-4 py-3 flex items-center gap-3">
            <Layers className="w-4 h-4 text-sky-500" />
            <div>
              <p className="text-xs text-sky-500 font-medium">Slots</p>
              <p className="text-lg font-bold text-sky-700">
                {Array.isArray(service.slots) ? service.slots.length : 0}{" "}
                <span className="text-sm font-normal text-sky-400">
                  slot{service.slots?.length !== 1 ? "s" : ""}
                </span>
              </p>
            </div>
          </div>

          {/* Status */}
          <div
            className={`border rounded-xl px-4 py-3 flex items-center gap-3 ${
              service.available
                ? "bg-emerald-50 border-emerald-100"
                : "bg-rose-50 border-rose-100"
            }`}
          >
            {service.available ? (
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-500" />
            )}
            <div>
              <p
                className={`text-xs font-medium ${
                  service.available ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                Status
              </p>
              <p
                className={`text-base font-bold ${
                  service.available ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {service.available ? "Available" : "Unavailable"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
