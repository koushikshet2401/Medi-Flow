import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { doctorListStyles } from "../assets/dummyStyles";
import {
  Users,
  Search,
  EyeClosed,
  Star,
  Trash2,
  IndianRupee,
  Sliders,
  CheckCircle,
  XCircle,
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
  const API_BASE =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://localhost:4000"
      : "https://medi-flow-backend.onrender.com";

  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

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
        showToast(body?.message || "Failed to delete doctor", "error");
        return;
      }
      showToast(`Dr. ${doc.name} deleted successfully`, "success");
      setDoctors((prev) => prev.filter((p) => (p._id || p.id) !== id));
      if (expanded === id) setExpanded(null);
    } catch (err) {
      console.error("delete error", err);
      showToast("Network error deleting doctor", "error");
    }
  }
  function applyStatusFilter(status) {
    setFilterStatus((prev) => (prev === status ? "all" : status));
    setExpanded(null);
    setShowAll(false);
  }

  return (
    <div className={doctorListStyles.container}>
      {/* ─── Toast Notifier ────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold text-white transition-all duration-300 ${toast.type === "success" ? "bg-emerald-500 animate-slideIn" : "bg-rose-500 animate-slideIn"}`}>
          {toast.type === "success" ? <CheckCircle className="w-4.5 h-4.5" /> : <XCircle className="w-4.5 h-4.5" />}
          {toast.msg}
        </div>
      )}
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
                          onClick={() => navigate(`/doctor/${id}`)}
                          className="px-3 py-1 cursor-pointer rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-105 active:scale-95 transition-all font-semibold text-xs flex items-center gap-1.5 shadow-sm"
                        >
                          <Sliders size={12} /> Edit
                        </button>

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
                  maxHeight: isOpen ? 400 : 0,
                  transition:
                    "max-height 300ms ease, padding 200ms ease",
                  paddingTop: isOpen ? 16 : 0,
                  paddingBottom: isOpen ? 16 : 0,
                }}
              >
                {isOpen && (
                  <DoctorQuickPreview doc={doc} />
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

function DoctorQuickPreview({ doc }) {
  const scheduleText = doc.availabilitySettings?.weeklyDays?.length
    ? doc.availabilitySettings.weeklyDays.join(", ")
    : "Not specified";

  return (
    <div className="grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-gray-100 text-sm text-gray-600 px-4">
      <div className="space-y-2 text-left">
        <p><span className="font-semibold text-gray-500">About:</span> {doc.about || "No biography provided."}</p>
        <p><span className="font-semibold text-gray-500">Qualifications:</span> {doc.qualification || doc.qualifications || "Not specified"}</p>
        <p><span className="font-semibold text-gray-500">Schedule:</span> {scheduleText}</p>
        <p><span className="font-semibold text-gray-500">Time slots:</span> {doc.slots || "Not specified"}</p>
      </div>
      <div className="space-y-2 text-right flex flex-col items-end">
        <p><span className="font-semibold text-gray-500">Success:</span> {doc.success || "98%"}</p>
        <p><span className="font-semibold text-gray-500">Patients:</span> {doc.patients || "12000"}</p>
        <p><span className="font-semibold text-gray-500">Location:</span> {doc.location || "Delhi"}</p>
      </div>
    </div>
  );
}
