import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import AdminLayout from "../components/AdminLayout";
import AvailabilityPanel from "../components/shared/AvailabilityPanel";
import EmergencyClosurePanel from "../components/shared/EmergencyClosurePanel";
import {
  ArrowLeft, Save, AlertTriangle, Calendar, Clock, Shield,
  User, MapPin, Star, CheckCircle, XCircle, Stethoscope, Loader2
} from "lucide-react";

const API_BASE =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:4000"
    : "https://medi-flow-backend.onrender.com";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Helper functions for date formatting and sorting
function formatDateISO(iso) {
  if (!iso || typeof iso !== "string") return iso;
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "June",
    "July", "Aug", "Sep", "Oct", "Nov", "Dec"
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

export default function DoctorEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [doctor, setDoctor]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null); // { msg, type }

  // Availability form state
  const [sessionMode, setSessionMode]   = useState("Both");
  const [weeklyDays, setWeeklyDays]     = useState(["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [newBlockDate, setNewBlockDate] = useState("");

  // Interactive Schedule Selector state
  const [activeScheduleDate, setActiveScheduleDate] = useState(null);

  // Emergency absence
  const [absenceDate, setAbsenceDate]       = useState("");
  const [absenceSession, setAbsenceSession] = useState("Both");
  const [triggeringAbsence, setTriggeringAbsence] = useState(false);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // Fetch doctor data
  const loadDoctorData = () => {
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
        
        // Pick the first upcoming date as selected active schedule date
        const scheduleMap = buildScheduleMap(doc.schedule || {});
        const sortedDates = getSortedScheduleDates(scheduleMap);
        if (sortedDates.length > 0 && !activeScheduleDate) {
          setActiveScheduleDate(sortedDates[0]);
        }
      })
      .catch(() => showToast("Failed to load doctor", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDoctorData();
  }, [id]);

  const removeBlockDate = (d) => {
    setBlockedDates(prev => prev.filter(x => x !== d));
  };

  // Robust Auth Token Resolver with detailed console debugging
  const resolveToken = async () => {
    console.log("=== [Frontend] Auth Token Resolution Check ===");
    
    // 1. Try Clerk auth context/store directly
    if (getToken) {
      try {
        const clerkToken = await getToken();
        if (clerkToken) {
          console.log("[Auth-Debug] SUCCESS: Retrieved token from Clerk useAuth context successfully:", clerkToken.slice(0, 30) + "...");
          return clerkToken;
        }
      } catch (e) {
        console.warn("[Auth-Debug] Clerk useAuth.getToken() check failed:", e);
      }
    }

    // 2. Try localStorage keys: clerk_token, token, authToken
    const localKeys = ["clerk_token", "token", "authToken"];
    for (const key of localKeys) {
      const t = localStorage.getItem(key);
      if (t) {
        console.log(`[Auth-Debug] SUCCESS: Resolved token from localStorage under key '${key}':`, t.slice(0, 30) + "...");
        return t;
      }
    }

    console.error("[Auth-Debug] FAILURE: No auth token found in Clerk context or any localStorage keys (clerk_token, token, authToken)!");
    return null;
  };

  // Save availability settings
  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await resolveToken();
      if (!token) {
        console.warn("[Auth-Debug] Save aborted: Token is missing!");
        showToast("Authentication token is missing. Please sign in again.", "error");
        setTimeout(() => navigate("/"), 2500);
        return;
      }

      console.log(`[Auth-Debug] Sending PUT request to ${API_BASE}/api/doctors/${id}/admin-update with Bearer token...`);
      const res = await fetch(`${API_BASE}/api/doctors/${id}/admin-update`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          availabilitySettings: {
            sessionMode,
            sessions: sessionMode,
            weeklyDays,
            blockedDates,
          },
        }),
      });

      console.log("[Auth-Debug] Received Response Status:", res.status);
      if (res.status === 401 || res.status === 403) {
        console.error("[Auth-Debug] Unauthorized status returned from backend!");
        showToast("Session expired or unauthorized. Redirecting to login...", "error");
        setTimeout(() => navigate("/"), 2200);
        return;
      }

      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        console.log("[Auth-Debug] Settings successfully saved! Payload:", body);
        showToast("Availability settings saved successfully!", "success");
        setDoctor(body.data || doctor);
      } else {
        console.warn("[Auth-Debug] Backend validation failed:", body?.message);
        showToast(body?.message || "Failed to save settings", "error");
      }
    } catch (err) {
      console.error("[Auth-Debug] Network error saving settings:", err);
      showToast("Network error — please try again", "error");
    } finally {
      setSaving(false);
    }
  };

  // Trigger emergency absence
  const handleAbsence = async () => {
    if (!absenceDate) { showToast("Please select a date for closure", "error"); return; }
    const confirmed = window.confirm(
      `Trigger Emergency Closure for Dr. ${doctor?.name} on ${absenceDate} (${absenceSession} session)?\n\nThis will automatically reschedule all affected appointments forward in sequential order.`
    );
    if (!confirmed) return;

    setTriggeringAbsence(true);
    try {
      const token = await resolveToken();
      if (!token) {
        console.warn("[Auth-Debug] Emergency closure aborted: Token is missing!");
        showToast("Authentication token is missing. Please sign in again.", "error");
        setTimeout(() => navigate("/"), 2500);
        return;
      }

      console.log(`[Auth-Debug] Sending POST request to ${API_BASE}/api/doctors/${id}/admin-absence with Bearer token...`);
      const res = await fetch(`${API_BASE}/api/doctors/${id}/admin-absence`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date: absenceDate,
          type: absenceSession === "Both" ? "full-day" : absenceSession.toLowerCase(),
        }),
      });

      console.log("[Auth-Debug] Received Response Status:", res.status);
      if (res.status === 401 || res.status === 403) {
        console.error("[Auth-Debug] Unauthorized status returned from backend!");
        showToast("Session expired or unauthorized. Redirecting to login...", "error");
        setTimeout(() => navigate("/"), 2200);
        return;
      }

      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        console.log("[Auth-Debug] Emergency closure registered! Payload:", body);
        showToast(
          `Emergency closure registered! ${body?.affectedAppointmentsCount ?? 0} appointment(s) rescheduled.`,
          "success"
        );
        setAbsenceDate("");
        
        // Instantly reload doctor slots & add local block date
        if (!blockedDates.includes(absenceDate)) {
          setBlockedDates(prev => [...prev, absenceDate].sort());
        }
        loadDoctorData();
      } else {
        console.warn("[Auth-Debug] Backend closure trigger failed:", body?.message);
        showToast(body?.message || "Failed to register closure", "error");
      }
    } catch (err) {
      console.error("[Auth-Debug] Network error registering closure:", err);
      showToast("Network error — please try again", "error");
    } finally {
      setTriggeringAbsence(false);
    }
  };
  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            <p className="font-semibold text-sm">Loading doctor profile details...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!doctor) {
    return (
      <AdminLayout>
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-sm">
            <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
            <p className="text-slate-600 font-bold mb-4">Doctor Profile not found.</p>
            <button
              onClick={() => navigate("/list")}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all"
            >
              ← Back to Doctor List
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const isAvailable = doctor.availability === "Available";
  const scheduleMap = buildScheduleMap(doctor.schedule || {});
  const sortedDates = getSortedScheduleDates(scheduleMap);
  
  // Slots calculated for currently active selected date
  const activeSlots = activeScheduleDate ? (scheduleMap[activeScheduleDate] || []) : [];

  return (
    <AdminLayout>
      <div className="min-h-screen bg-slate-50/50 pb-16 font-sans">
        
        {/* ─── Floating Toast Notification ──────────────────────────────────── */}
        {toast && (
          <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold text-white transition-all duration-300 ${toast.type === "success" ? "bg-emerald-500 animate-slideIn" : "bg-rose-500 animate-slideIn"}`}>
            {toast.type === "success" ? <CheckCircle className="w-4.5 h-4.5" /> : <XCircle className="w-4.5 h-4.5" />}
            {toast.msg}
          </div>
        )}

        {/* ─── Breadcrumb Sticky Bar ────────────────────────────────────────── */}
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200/60 shadow-xs px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate("/list")}
            className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors font-semibold text-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Doctor List
          </button>
          <h1 className="text-slate-800 font-black text-sm sm:text-base truncate">
            Manage Doctor Profile — <span className="text-blue-600">Dr. {doctor.name}</span>
          </h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all cursor-pointer"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

          {/* ──────────────────────────────────────────────────────────────────
              SECTION 1: TOP PROFILE SECTION
              ────────────────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-3xl shadow-xs border border-slate-200/60 p-6 flex flex-col md:flex-row gap-6 items-start hover:shadow-sm transition-all duration-300">
            <div className="relative flex-shrink-0 mx-auto md:mx-0">
              <img
                src={doctor.imageUrl || doctor.image || "/placeholder-doctor.jpg"}
                alt={doctor.name}
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover shadow-md border-3 border-blue-50/70"
              />
              <span className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-3 border-white shadow-md ${isAvailable ? "bg-emerald-400" : "bg-rose-400"}`} />
            </div>

            <div className="flex-1 min-w-0 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 mb-1.5">
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">{doctor.name}</h2>
                <span className={`text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${isAvailable ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                  {isAvailable ? "Available" : "Unavailable"}
                </span>
              </div>
              <p className="text-blue-600 font-bold text-sm sm:text-base mb-3.5">{doctor.specialization || doctor.speciality}</p>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-500">
                <span className="flex items-center gap-1.5"><Stethoscope className="w-4 h-4 text-blue-500" /> {doctor.experience} experience</span>
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-rose-500" /> {doctor.location || "Delhi"}</span>
                <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-400 fill-amber-400" /> {doctor.rating || "5.0"} rating</span>
                <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-teal-500" /> {doctor.patients || "0"} patients</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center md:text-right min-w-[140px] w-full md:w-auto flex-shrink-0">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">Consultation Fee</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-800">₹{doctor.fee}</p>
              <p className="text-[10px] text-slate-400">per session session</p>
            </div>
          </div>

          {/* ─── Main Content Grid ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── LEFT & MIDDLE: INFO & SCHEDULE SECTIONS ── */}
            <div className="lg:col-span-2 space-y-6">

              {/* ──────────────────────────────────────────────────────────────
                  SECTION 2: INFORMATION SECTION
                  ────────────────────────────────────────────────────────────── */}
              <div className="bg-white rounded-3xl shadow-xs border border-slate-200/60 p-6 hover:shadow-sm transition-all duration-300">
                <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-3.5">
                  <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                    <User className="w-4.5 h-4.5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">Information Details</h3>
                    <p className="text-[11px] text-slate-400">Read-only biographical & profile summaries</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">About Doctor Biography</h4>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50/50 p-4 rounded-2xl border border-slate-100 shadow-xs">
                      {doctor.about || "No biography provided by the doctor."}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Academic Qualifications</h4>
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 bg-slate-50/50 px-4 py-3 rounded-2xl border border-slate-100 shadow-xs">
                      {doctor.qualification || doctor.qualifications || "Doctor qualifications are not registered."}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-2xl text-center shadow-xs">
                      <h5 className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-0.5">Success Rate</h5>
                      <p className="text-base sm:text-lg font-black text-emerald-600">{doctor.success || "98%"}</p>
                    </div>
                    <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-2xl text-center shadow-xs">
                      <h5 className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-0.5">Patients Managed</h5>
                      <p className="text-base sm:text-lg font-black text-slate-800">{doctor.patients || "0"}</p>
                    </div>
                    <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-2xl text-center shadow-xs">
                      <h5 className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-0.5">Practice Location</h5>
                      <p className="text-xs sm:text-sm font-black text-slate-800 truncate">{doctor.location || "Delhi"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN: SETTINGS & CLOSURE SECTIONS ── */}
            <div className="space-y-6">

              {/* ──────────────────────────────────────────────────────────────
                  SECTION 4: AVAILABILITY MANAGEMENT SECTION
                  ────────────────────────────────────────────────────────────── */}
              <AvailabilityPanel
                sessionMode={sessionMode}
                setSessionMode={setSessionMode}
                weeklyDays={weeklyDays}
                setWeeklyDays={setWeeklyDays}
                blockedDates={blockedDates}
                setBlockedDates={setBlockedDates}
                saving={saving}
                onSave={handleSave}
              />

              {/* ──────────────────────────────────────────────────────────────
                  SECTION 5: EMERGENCY ABSENCE SECTION
                  ────────────────────────────────────────────────────────────── */}
              <EmergencyClosurePanel
                entityName={`Dr. ${doctor.name}`}
                absenceDate={absenceDate}
                setAbsenceDate={setAbsenceDate}
                absenceSession={absenceSession}
                setAbsenceSession={setAbsenceSession}
                triggering={triggeringAbsence}
                onTrigger={handleAbsence}
              />

            </div>

          </div>

        </div>
      </div>
    </AdminLayout>
  );
}
