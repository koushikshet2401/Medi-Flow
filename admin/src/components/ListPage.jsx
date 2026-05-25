import React, { useState, useEffect, useMemo } from "react";
import { doctorListStyles } from "../assets/dummyStyles";
import {
  Users,
  Search,
  EyeClosed,
  Star,
  Trash2,
  IndianRupee,
} from "lucide-react";

//Helper function
function formatDateISO(iso) {
  if (!iso || typeof iso !== "string") return iso;
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "June",
    "July",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const day = String(Number(d));
  const month = monthNames[dateObj.getMonth()] || "";
  return `${day} ${month} ${y}`;
}

function normalizeToDateString(d) {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().split("T")[0];
}

function buildScheduleMap(schedule) {
  const map = {};
  if (!schedule || typeof schedule !== "object") return map;
  Object.entries(schedule).forEach(([k, v]) => {
    const nd = normalizeToDateString(k) || String(k);
    map[nd] = Array.isArray(v) ? v.slice() : [];
  });
  return map;
}

function getSortedScheduleDates(scheduleLike) {
  let keys = [];
  if (Array.isArray(scheduleLike)) {
    keys = scheduleLike.map(normalizeToDateString).filter(Boolean);
  } else if (scheduleLike && typeof scheduleLike === "object") {
    keys = Object.keys(scheduleLike).map(normalizeToDateString).filter(Boolean);
  }

  keys = Array.from(new Set(keys));
  const parsed = keys.map((ds) => ({ ds, date: new Date(ds) }));
  const dateVal = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

  const today = new Date();
  const todayVal = dateVal(today);

  const past = parsed
    .filter((p) => dateVal(p.date) < todayVal)
    .sort((a, b) => dateVal(b.date) - dateVal(a.date));

  const future = parsed
    .filter((p) => dateVal(p.date) >= todayVal)
    .sort((a, b) => dateVal(a.date) - dateVal(b.date));

  return [...past, ...future].map((p) => p.ds);
}

function ListPage() {
  const API_BASE = "https://medi-flow-backend.onrender.com";

  const [doctors, setDoctors] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(false);

  const [isMobileScreen, setIsMobileScreen] = useState(false);
  useEffect(() => {
    function onResize() {
      if (typeof window === "undefined") return;
      setIsMobileScreen(window.innerWidth < 640);
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  //to fetch doctors
  async function fetchDoctors() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/doctors`);
      const body = await res.json().catch(() => null);

      if (res.ok && body && body.success) {
        const list = Array.isArray(body.data)
          ? body.data
          : Array.isArray(body.doctors)
            ? body.doctors
            : [];
        const normalized = list.map((d) => {
          const scheduleMap = buildScheduleMap(d.schedule || {});
          return {
            ...d,
            schedule: scheduleMap,
          };
        });
        setDoctors(normalized);
      } else {
        console.error("Failed to fetch doctors", { status: res.status, body });
        setDoctors([]);
      }
    } catch (err) {
      console.error("Network error fetching doctors", err);
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDoctors();
  }, []);

  ///to filter doctor
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = doctors;
    if (filterStatus === "available") {
      list = list.filter(
        (d) => (d.availability || "").toString().toLowerCase() === "available",
      );
    } else if (filterStatus === "unavailable") {
      list = list.filter(
        (d) => (d.availability || "").toString().toLowerCase() !== "available",
      );
    }
    if (!q) return list;
    return list.filter((d) => {
      return (
        (d.name || "").toLowerCase().includes(q) ||
        (d.specialization || "").toLowerCase().includes(q)
      );
    });
  }, [doctors, query, filterStatus]);

  // show doctor according to filter
  const displayed = useMemo(() => {
    if (showAll) return filtered;
    return filtered.slice(0, 6);
  }, [filtered, showAll]);

  function toggle(id) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  // to delete doctor
  async function removeDoctor(id) {
    const doc = doctors.find((d) => (d._id || d.id) === id);
    if (!doc) return;
    const ok = window.confirm(`Delete ${doc.name}? This cannot be undone.`);
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE}/api/doctors/${id}`, {
        method: "DELETE",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        alert(body?.message || "Failed to delete");
        return;
      }
      setDoctors((prev) => prev.filter((p) => (p._id || p.id) !== id));
      if (expanded === id) setExpanded(null);
    } catch (err) {
      console.error("delete error", err);
      alert("Network error deleting doctor");
    }
  }
  function applyStatusFilter(status) {
    setFilterStatus((prev) => (prev === status ? "all" : status));
    setExpanded(null);
    setShowAll(false);
  }

  return (
    <div className={doctorListStyles.container}>
      <header className={doctorListStyles.headerContainer}>
        <div className={doctorListStyles.headerTopSection}>
          <div className={doctorListStyles.headerIconContainer}>
            <div className={doctorListStyles.headerIcon}>
              <Users size={20} className={doctorListStyles.headerIconSvg} />
            </div>

            <div>
              <h1 className={doctorListStyles.headerTitle}>Find a Doctor</h1>
              <p className={doctorListStyles.headerSubtitle}>
                Search by name or specialization
              </p>
            </div>
          </div>

          <div className={doctorListStyles.headerSearchContainer}>
            <div className={doctorListStyles.searchBox}>
              <Search size={16} className={doctorListStyles.searchIcon} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Doctors, Specialization"
                className={doctorListStyles.searchInput}
              />
            </div>

            <button
              onClick={() => {
                setQuery("");
                setExpanded(null);
                setShowAll(false);
                setFilterStatus("all");
              }}
              className={doctorListStyles.clearButton}
            >
              Clear
            </button>
          </div>
        </div>
        <div className={doctorListStyles.filterContainer}>
          <button
            onClick={() => applyStatusFilter("available")}
            className={doctorListStyles.filterButton(
              filterStatus === "available",
              "emerald",
            )}
          >
            Available
          </button>

          <button
            onClick={() => applyStatusFilter("unavailable")}
            className={doctorListStyles.filterButton(
              filterStatus === "unavailable",
              "red",
            )}
          >
            Unavailable
          </button>
        </div>
      </header>

      <main className={doctorListStyles.gridContainer}>
        {loading && (
          <div className={doctorListStyles.loadingContainer}>
            Loading Doctors...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className={doctorListStyles.noResultsContainer}>
            No Doctors match your search.
          </div>
        )}

        {displayed.map((doc) => {
          const id = doc._id || doc.id;
          const isOpen = expanded === id;
          const isAvailable = doc.availability === "Available";

          const scheduleMap = buildScheduleMap(doc.schedule || {});
          const sortedDates = getSortedScheduleDates(scheduleMap);

          return (
            <article key={id} className={doctorListStyles.article}>
              <div className={doctorListStyles.articleContent}>
                <img
                  src={doc.imageUrl || doc.image || ""}
                  aria-colcount={doc.name}
                  className={doctorListStyles.doctorImage}
                />

                <div className={doctorListStyles.doctorInfoContainer}>
                  <div className={doctorListStyles.doctorHeader}>
                    <div className="min-w-0 w-full">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={doctorListStyles.doctorName}>
                          {doc.name}
                        </h3>
                        <span
                          className={doctorListStyles.availabilityBadge(
                            isAvailable,
                          )}
                        >
                          <span
                            className={doctorListStyles.availabilityDot(
                              isAvailable,
                            )}
                          />

                          {isAvailable ? "Available" : "Unavailable"}
                        </span>
                      </div>

                      <div className={doctorListStyles.doctorDetails}>
                        {doc.specialization} * {doc.experience} years
                      </div>
                    </div>

                    <div className={doctorListStyles.ratingContainer}>
                      <div className={doctorListStyles.rating}>
                        <Star size={14} />
                        {doc.rating}
                      </div>
                      <button
                        onClick={() => toggle(id)}
                        className={doctorListStyles.toggleButton(isOpen)}
                      >
                        <EyeClosed size={18} />
                      </button>
                    </div>
                  </div>

                  <div className={doctorListStyles.statsContainer}>
                    <div className={doctorListStyles.statsLabel}>Patients</div>
                    <div className={doctorListStyles.statsValue}>
                      <Users size={14} />
                      {doc.patients}
                    </div>

                    <div className={doctorListStyles.actionContainer}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeDoctor(id)}
                          className={doctorListStyles.deleteButton}
                        >
                          <Trash2 size={14} /> Delete
                        </button>

                        <div className={doctorListStyles.feesLabel}>
                          <div className={doctorListStyles.feesValue}>
                            <IndianRupee />
                            {doc.fee}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={doctorListStyles.expandableContent}
                style={{
                  maxHeight: isOpen ? (isMobileScreen ? 320 : 600) : 0,
                  transition:
                    "max-height 420ms cubic-bezier(.2,.9,.2,1), padding 220ms ease",
                  paddingTop: isOpen ? 16 : 0,
                  paddingBottom: isOpen ? 16 : 0,
                }}
              >
                {isOpen && (
                  <DoctorAvailabilityPanel doc={doc} API_BASE={API_BASE} fetchDoctors={fetchDoctors} />
                )}
              </div>
            </article>
          );
        })}

        {filtered.length > 6 && (
          <div className={doctorListStyles.showMoreContainer}>
            <button
              onClick={() => setShowAll((s) => !s)}
              className={doctorListStyles.showMoreButton}
            >
              {showAll ? "Show Less" : `Show more (${filtered.length - 4})`}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default ListPage;

function DoctorAvailabilityPanel({ doc, API_BASE, fetchDoctors }) {
  const [sessionMode, setSessionMode] = useState(doc.availabilitySettings?.sessionMode || "Both");
  const [weeklyDays, setWeeklyDays] = useState(doc.availabilitySettings?.weeklyDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);
  const [blockedDates, setBlockedDates] = useState(doc.availabilitySettings?.blockedDates || []);
  const [newBlockDate, setNewBlockDate] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Absence state
  const [absenceDate, setAbsenceDate] = useState("");
  const [absenceSession, setAbsenceSession] = useState("Both");
  const [triggeringAbsence, setTriggeringAbsence] = useState(false);

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const handleDayToggle = (day) => {
    setWeeklyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleAddBlockDate = () => {
    if (!newBlockDate) return;
    if (blockedDates.includes(newBlockDate)) return;
    setBlockedDates((prev) => [...prev, newBlockDate]);
    setNewBlockDate("");
  };

  const handleRemoveBlockDate = (dateStr) => {
    setBlockedDates((prev) => prev.filter((d) => d !== dateStr));
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const settings = {
        sessionMode,
        weeklyDays,
        blockedDates,
      };
      
      const res = await fetch(`${API_BASE}/api/doctors/${doc._id || doc.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          availabilitySettings: JSON.stringify(settings),
        }),
      });

      const body = await res.json().catch(() => null);
      if (res.ok) {
        alert("Availability settings updated successfully!");
        fetchDoctors();
      } else {
        alert(body?.message || "Failed to update availability settings");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTriggerAbsence = async () => {
    if (!absenceDate) {
      alert("Please select a date for emergency absence");
      return;
    }
    const ok = window.confirm(
      `Trigger Emergency Absence for ${doc.name} on ${absenceDate} (${absenceSession})?\nThis will automatically push and reschedule affected bookings forward.`
    );
    if (!ok) return;

    setTriggeringAbsence(true);
    try {
      const res = await fetch(`${API_BASE}/api/doctors/${doc._id || doc.id}/absence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: absenceDate,
          session: absenceSession,
        }),
      });

      const body = await res.json().catch(() => null);
      if (res.ok) {
        alert(
          `Emergency Closure registered successfully!\nMoved ${body?.affectedAppointmentsCount || 0} appointment(s).`
        );
        fetchDoctors();
      } else {
        alert(body?.message || "Failed to register emergency closure");
      }
    } catch (err) {
      console.error(err);
      alert("Error registering emergency closure");
    } finally {
      setTriggeringAbsence(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
      {/* COLUMN 1: Basic & Weekly Days */}
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-gray-900 border-b pb-1 mb-2">Doctor Profile</h4>
          <p className="text-xs text-gray-600 mb-2">
            <strong>Qualifications:</strong> {doc.qualifications}
          </p>
          <p className="text-xs text-gray-600 mb-2">
            <strong>Location:</strong> {doc.location}
          </p>
          <p className="text-xs text-gray-600">
            <strong>About:</strong> {doc.about || "No biography provided."}
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 border-b pb-1 mb-2">Session Preference</h4>
          <select
            value={sessionMode}
            onChange={(e) => setSessionMode(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="Morning">Morning Only (9:30 AM – 1:30 PM)</option>
            <option value="Afternoon">Afternoon Only (2:30 PM – 5:30 PM)</option>
            <option value="Both">Both Sessions (Full Day)</option>
          </select>
        </div>
      </div>

      {/* COLUMN 2: Weekly Days & Date Blocking */}
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-gray-900 border-b pb-1 mb-2">Weekly Availability</h4>
          <div className="grid grid-cols-2 gap-2">
            {daysOfWeek.map((day) => {
              const checked = weeklyDays.includes(day);
              return (
                <label key={day} className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleDayToggle(day)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                  />
                  <span>{day}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 border-b pb-1 mb-2">Blocked Dates</h4>
          <div className="flex gap-2 mb-2">
            <input
              type="date"
              value={newBlockDate}
              onChange={(e) => setNewBlockDate(e.target.value)}
              className="flex-1 p-1.5 border border-gray-300 rounded text-xs bg-white"
            />
            <button
              onClick={handleAddBlockDate}
              className="px-3 py-1 bg-gray-800 text-white rounded text-xs hover:bg-gray-700"
            >
              Block
            </button>
          </div>
          <div className="max-h-24 overflow-y-auto border border-gray-200 rounded p-1 bg-white space-y-1">
            {blockedDates.length === 0 ? (
              <p className="text-xs text-gray-400 p-1">No date blocks set.</p>
            ) : (
              blockedDates.map((date) => (
                <div key={date} className="flex items-center justify-between text-xs bg-gray-100 px-2 py-0.5 rounded">
                  <span>{date}</span>
                  <button
                    onClick={() => handleRemoveBlockDate(date)}
                    className="text-red-500 hover:text-red-700 font-bold"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={savingSettings}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium rounded transition"
        >
          {savingSettings ? "Saving Settings..." : "Save Availability Settings"}
        </button>
      </div>

      {/* COLUMN 3: Emergency Absence & Shifting */}
      <div className="space-y-4 bg-red-50 border border-red-200 rounded p-4">
        <div>
          <h4 className="font-semibold text-red-900 border-b border-red-200 pb-1 mb-2 flex items-center gap-1.5">
            ⚠️ Emergency Absence
          </h4>
          <p className="text-xs text-red-700 mb-3">
            Triggering an absence instantly blocks the selected date/session and automatically reschedules all impacted patient appointments forward in sequential order.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-red-800">Select Date</label>
          <input
            type="date"
            value={absenceDate}
            onChange={(e) => setAbsenceDate(e.target.value)}
            className="w-full p-2 border border-red-300 rounded text-xs bg-white"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-red-800">Select Session</label>
          <select
            value={absenceSession}
            onChange={(e) => setAbsenceSession(e.target.value)}
            className="w-full p-2 border border-red-300 rounded text-xs bg-white"
          >
            <option value="Morning">Morning Only (9:30 AM – 1:30 PM)</option>
            <option value="Afternoon">Afternoon Only (2:30 PM – 5:30 PM)</option>
            <option value="Both">Both Sessions (Full Day)</option>
          </select>
        </div>

        <button
          onClick={handleTriggerAbsence}
          disabled={triggeringAbsence}
          className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold rounded text-xs transition uppercase tracking-wider"
        >
          {triggeringAbsence ? "Processing Shifting..." : "Trigger Emergency Closure"}
        </button>
      </div>
    </div>
  );
}
