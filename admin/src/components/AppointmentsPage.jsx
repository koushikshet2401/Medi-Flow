import React, { useEffect, useMemo, useState } from 'react';
import { adminApptStyles, keyframesStyles } from '../assets/dummyStyles';
import { Calendar, Search, IndianRupee, Clock, Edit2, Check, X } from 'lucide-react';

const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:4000"
  : "https://medi-flow-backend.onrender.com";

// HELPER FUNCTIONS
function formatDateISO(iso) {
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch (e) {
    return iso;
  }
}

function dateTimeFromSlot(slot) {
  try {
    const [y, m, d] = slot.date.split("-");
    const base = new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);

    const [time, ampm] = slot.time.split(" ");
    let [hh, mm] = time.split(":").map(Number);
    if (ampm === "PM" && hh !== 12) hh += 12;
    if (ampm === "AM" && hh === 12) hh = 0;
    base.setHours(hh, mm, 0, 0);
    return base;
  } catch (e) {
    return new Date(slot.date + "T00:00:00");
  }
}

const AppointmentsPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterSpeciality, setFilterSpeciality] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showAll, setShowAll] = useState(false);

  // Track currently saving items (for visual indicators)
  const [savingIds, setSavingIds] = useState(new Set());

  // Track reschedule panel state per appointment card
  const [rescheduleData, setRescheduleData] = useState({});

  // fetch list from server
  const loadAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query.trim();
      const url = `${API_BASE}/api/appointments?limit=200${q ? `&search=${encodeURIComponent(q)}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Failed to fetch (${res.status})`);
      }
      const data = await res.json();
      const items = (data?.appointments || []).map((a) => {
        const doctorName = (a.doctorId && a.doctorId.name) || a.doctorName || "";
        const speciality =
          (a.doctorId && a.doctorId.specialization) ||
          a.speciality ||
          a.specialization ||
          "General";
        const fee = typeof a.fees === "number" ? a.fees : a.fee || 0;
        return {
          id: a._id || a.id,
          patientName: a.patientName || "",
          age: a.age || "",
          gender: a.gender || "",
          mobile: a.mobile || "",
          doctorName,
          speciality,
          fee,
          slot: {
            date: a.date || (a.slot && a.slot.date) || "",
            time: a.time || (a.slot && a.slot.time) || "00:00 AM",
          },
          status: a.status || (a.payment && a.payment.status) || "Pending",
          refundStatus: a.refundStatus || "None",
          visitConfirmation: a.visitConfirmation || "Pending",
          raw: a,
        };
      });
      setAppointments(items);
    } catch (err) {
      console.error("Load appointments error:", err);
      setError(err.message || "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  // Compute available specialities
  const specialities = useMemo(() => {
    const set = new Set(appointments.map((a) => a.speciality || "General"));
    return ["all", ...Array.from(set)];
  }, [appointments]);

  // filter by speciality, date, query, and status
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return appointments.filter((a) => {
      if (
        filterSpeciality !== "all" &&
        (a.speciality || "").toLowerCase() !== filterSpeciality.toLowerCase()
      )
        return false;
      if (filterDate && a.slot?.date !== filterDate) return false;
      if (filterStatus !== "all") {
        if (filterStatus === "Refund Requested") {
          if (a.refundStatus !== "Pending") return false;
        } else if (filterStatus === "Refund Approved") {
          if (a.refundStatus !== "Approved") return false;
        } else if (
          (a.status || "").toLowerCase() !== filterStatus.toLowerCase()
        ) {
          return false;
        }
      }
      if (!q) return true;
      return (
        (a.doctorName || "").toLowerCase().includes(q) ||
        (a.speciality || "").toLowerCase().includes(q) ||
        (a.patientName || "").toLowerCase().includes(q) ||
        (a.mobile || "").toLowerCase().includes(q)
      );
    });
  }, [appointments, query, filterDate, filterSpeciality, filterStatus]);

  // sort filtered by datetime in descending order
  const sortedFiltered = useMemo(() => {
    return filtered.slice().sort((a, b) => {
      const da = dateTimeFromSlot(a.slot).getTime();
      const db = dateTimeFromSlot(b.slot).getTime();
      return db - da;
    });
  }, [filtered]);

  const displayed = useMemo(
    () => (showAll ? sortedFiltered : sortedFiltered.slice(0, 8)),
    [sortedFiltered, showAll]
  );

  // Status Change API Call
  const handleStatusChange = async (id, newStatus) => {
    setSavingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    try {
      const res = await fetch(`${API_BASE}/api/appointments/${id}?adminOverride=true`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Failed to update status (${res.status})`);
      }

      // Update local state
      setAppointments((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
      );
    } catch (err) {
      console.error("Status update error:", err);
      alert(err.message || "Failed to update appointment status");
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Reschedule API Call
  const handleRescheduleSubmit = async (id) => {
    const data = rescheduleData[id];
    if (!data?.date || !data?.time) {
      alert("Please select both Date and Time to reschedule");
      return;
    }

    setSavingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    try {
      const res = await fetch(`${API_BASE}/api/appointments/${id}?adminOverride=true`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: data.date, time: data.time }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Failed to reschedule (${res.status})`);
      }

      // Update local state
      setAppointments((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                status: "Rescheduled",
                slot: { date: data.date, time: data.time },
              }
            : p
        )
      );

      // Close panel
      setRescheduleData((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      console.error("Reschedule error:", err);
      alert(err.message || "Failed to reschedule appointment");
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Approve Refund API Call
  const handleApproveRefund = async (id) => {
    if (!window.confirm("Are you sure you want to approve this refund? This will refund the payment and mark the appointment as Canceled / Refunded.")) {
      return;
    }
    setSavingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    try {
      const res = await fetch(`${API_BASE}/api/appointments/${id}/approve-refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Failed to approve refund (${res.status})`);
      }

      const body = await res.json();
      alert(body.message || "Refund approved successfully!");
      
      // Reload everything to sync stats and updated appointments
      await loadAppointments();
    } catch (err) {
      console.error("Refund approval error:", err);
      alert(err.message || "Failed to approve refund");
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const toggleReschedulePanel = (id, currentSlot) => {
    setRescheduleData((prev) => {
      if (prev[id]) {
        const next = { ...prev };
        delete next[id];
        return next;
      } else {
        return {
          ...prev,
          [id]: {
            date: currentSlot.date,
            time: currentSlot.time,
          },
        };
      }
    });
  };

  const updateRescheduleField = (id, field, value) => {
    setRescheduleData((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const s = adminApptStyles;

  return (
    <div className={s.page}>
      <style>{keyframesStyles}</style>
      <div className={s.inner}>
        
        {/* Header */}
        <header className={s.header}>
          <div className={s.headerLeft}>
            <h1 className={s.headerTitle}>Appointments</h1>
            <p className={s.headerSub}>
              Manage, reschedule, and update patient appointments
            </p>
          </div>

          <div className={s.controls}>
            <div className={s.searchWrap}>
              <Search size={16} className={s.searchIcon} />
              <input
                className={s.searchInput}
                placeholder="Search patient, doctor, speciality, mobile"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className={s.dateWrap}>
              <Calendar size={14} className={s.searchIcon} />
              <input
                type="date"
                className={s.dateInput}
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>

            <select
              className={s.specialitySelect}
              value={filterSpeciality}
              onChange={(e) => setFilterSpeciality(e.target.value)}
            >
              {specialities.map((sp) => (
                <option value={sp} key={sp}>
                  {sp === "all" ? "All specialties" : sp}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setQuery("");
                setFilterDate("");
                setFilterSpeciality("all");
                setFilterStatus("all");
                setShowAll(false);
                setError(null);
              }}
              className={s.clearBtn}
            >
              Clear
            </button>
          </div>
        </header>

        {/* Status Filter Tabs */}
        <div className={s.statusTabsWrap}>
          {["all", "Pending", "Confirmed", "Completed", "Canceled", "Rescheduled", "Refund Requested", "Refund Approved"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={s.statusTab(filterStatus === status)}
            >
              {status === "all" ? "All Statuses" : status}
            </button>
          ))}
        </div>

        {/* List Content */}
        {loading ? (
          <div className={s.loadingBox}>Loading appointments...</div>
        ) : error ? (
          <div className={s.errorBox}>{error}</div>
        ) : sortedFiltered.length === 0 ? (
          <div className={s.emptyBox}>No appointments found.</div>
        ) : (
          <main className={s.grid}>
            {displayed.map((a, idx) => {
              const isSaving = savingIds.has(a.id);
              const isRescheduling = !!rescheduleData[a.id];

              return (
                <div
                  key={a.id}
                  style={{
                    animation: `fadeUp 420ms cubic-bezier(.2,.9,.2,1) forwards`,
                    animationDelay: `${idx * 50}ms`,
                    opacity: 0,
                  }}
                  className={s.card(isSaving)}
                >
                  {/* Card Top / Patient & Doctor details */}
                  <div className={s.cardTop}>
                    <div className={s.cardPatient}>
                      <h3 className={s.cardName}>{a.patientName}</h3>
                      <div className={s.cardMeta}>
                        <span>{a.age ? `${a.age} yrs` : ""}</span>
                        {a.age && a.gender && <span>•</span>}
                        <span>{a.gender}</span>
                      </div>
                      <div className={s.cardMeta}>
                        <span>{a.mobile}</span>
                      </div>
                      <div className={s.cardDoctor}>
                        <span className={s.cardDoctorBold}>{a.doctorName}</span>
                        <span className="text-gray-400"> ({a.speciality})</span>
                      </div>
                    </div>

                    <div className={s.cardFeeCol}>
                      <span className={s.cardFeeLabel}>Fees</span>
                      <div className={s.cardFeeValue}>
                        <IndianRupee size={15} />
                        <span>{a.fee}</span>
                      </div>
                    </div>
                  </div>

                  {/* Slot Information */}
                  <div className={s.slotRow}>
                    <div className={s.slotBadge}>
                      <Calendar size={13} className="text-sky-400" />
                      <span>{formatDateISO(a.slot.date)} — {a.slot.time}</span>
                    </div>

                    <div className={s.statusBadge(a.status)}>
                      {a.status.toUpperCase()}
                    </div>
                  </div>

                  {/* Visit Confirmation Display */}
                  {a.visitConfirmation !== "Pending" && (
                    <div className="mx-4 mt-1 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-medium">Confirmation Status:</span>
                      {a.visitConfirmation === "Coming" ? (
                        <span className="px-1.5 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800 text-[10px]">Patient confirmed they are coming.</span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded font-semibold bg-rose-100 text-rose-800 text-[10px]">Not Coming</span>
                      )}
                    </div>
                  )}

                  {/* Refund Request Alerts & Action Buttons */}
                  {a.refundStatus === "Pending" && (
                    <div className="mx-4 mt-2 mb-1 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-800 animate-pulse">
                      <span className="font-semibold">Refund Requested</span>
                      <button
                        onClick={() => handleApproveRefund(a.id)}
                        disabled={isSaving}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-750 text-white rounded font-bold shadow-sm transition-all duration-200 cursor-pointer disabled:opacity-50 text-[11px]"
                      >
                        Refund
                      </button>
                    </div>
                  )}

                  {a.refundStatus === "Approved" && (
                    <div className="mx-4 mt-2 mb-1 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-1.5 text-xs text-emerald-800">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span className="font-semibold">Refund Approved & Processed</span>
                    </div>
                  )}

                  {/* Actions / Management controls */}
                  <div className={s.actionsRow}>
                    <select
                      value={a.status}
                      onChange={(e) => handleStatusChange(a.id, e.target.value)}
                      className={s.statusSelect}
                      disabled={isSaving}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Completed">Completed</option>
                      <option value="Canceled">Canceled</option>
                      <option value="Rescheduled">Rescheduled</option>
                    </select>

                    <button
                      onClick={() => toggleReschedulePanel(a.id, a.slot)}
                      className={s.rescheduleBtn(isRescheduling)}
                      disabled={isSaving}
                    >
                      <Edit2 size={13} />
                      <span>Reschedule</span>
                    </button>
                  </div>

                  {/* Inline Reschedule Expandable Panel */}
                  {isRescheduling && (
                    <div className={s.reschedulePanel}>
                      <div className={s.reschedulePanelTitle}>Reschedule Appointment</div>
                      
                      <div>
                        <label className={s.reschedulePanelLabel}>New Date</label>
                        <input
                          type="date"
                          className={s.rescheduleDateInput}
                          value={rescheduleData[a.id]?.date || ""}
                          onChange={(e) => updateRescheduleField(a.id, "date", e.target.value)}
                        />
                      </div>

                      <div>
                        <label className={s.reschedulePanelLabel}>New Time (e.g. 10:00 AM)</label>
                        <input
                          type="text"
                          placeholder="e.g. 10:00 AM"
                          className={s.rescheduleTimeInput}
                          value={rescheduleData[a.id]?.time || ""}
                          onChange={(e) => updateRescheduleField(a.id, "time", e.target.value)}
                        />
                      </div>

                      <div className="flex gap-2 justify-end mt-1">
                        <button
                          onClick={() => toggleReschedulePanel(a.id)}
                          className={s.rescheduleCancelBtn}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleRescheduleSubmit(a.id)}
                          className={s.rescheduleSaveBtn}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </main>
        )}

        {/* Pagination / Show More */}
        {sortedFiltered.length > 8 && (
          <div className={s.showMoreWrap}>
            <button
              onClick={() => setShowAll((prev) => !prev)}
              className={s.showMoreBtn}
            >
              {showAll ? "Show Less" : `Show more (${sortedFiltered.length - 8})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentsPage;