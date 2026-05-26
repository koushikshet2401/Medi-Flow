import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  AlertTriangle,
  Calendar,
  Clock,
  Shield,
  User,
  CheckCircle,
  XCircle,
  Loader2,
  Image as ImageIcon,
  Trash2
} from "lucide-react";
import AdminLayout from "../components/AdminLayout";

const API_BASE =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:4000"
    : "https://medi-flow-backend.onrender.com";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function formatDateISO(iso) {
  if (!iso || typeof iso !== "string") return iso;
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const day = String(Number(d));
  const month = monthNames[dateObj.getMonth()] || "";
  return `${day} ${month} ${y}`;
}

export default function ServiceEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [service, setService] = useState(null);

  // Form states
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [available, setAvailable] = useState(true);
  const [about, setAbout] = useState("");
  const [instructionsText, setInstructionsText] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [imageFile, setImageFile] = useState(null);

  // Availability Settings states
  const [sessionMode, setSessionMode] = useState("Both");
  const [weeklyDays, setWeeklyDays] = useState(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [newBlockDate, setNewBlockDate] = useState("");

  // Absence/Closure states
  const [absenceDate, setAbsenceDate] = useState("");
  const [absenceSession, setAbsenceSession] = useState("Both");
  const [triggeringAbsence, setTriggeringAbsence] = useState(false);

  // Toast notifications state
  const [toasts, setToasts] = useState([]);

  function addToast(message, type = "success", ttl = 3000) {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl);
  }

  // Fetch Service Details
  const fetchServiceData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/services/${id}`);
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        addToast(body?.message || "Failed to load service", "error");
        setLoading(false);
        return;
      }

      const svc = body?.data || body?.service;
      if (!svc) {
        addToast("Service details not found", "error");
        setLoading(false);
        return;
      }

      setService(svc);
      setName(svc.name || "");
      setPrice(svc.price ?? svc.fee ?? 0);
      setAvailable(svc.available ?? svc.availability === "Available");
      setAbout(svc.about || "");
      
      const instructionsArray = svc.instructions || svc.preInstructions || [];
      setInstructionsText(instructionsArray.join("\n"));
      
      setImagePreview(svc.imageUrl || svc.image || "");

      // Parse Availability Settings
      const settings = svc.availabilitySettings || {};
      setSessionMode(settings.sessions || settings.sessionMode || "Both");
      setWeeklyDays(settings.weeklyDays?.length ? settings.weeklyDays : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);
      setBlockedDates(Array.isArray(settings.blockedDates) ? settings.blockedDates : []);
    } catch (err) {
      console.error(err);
      addToast("Network error loading service", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceData();
  }, [id]);

  // Interactive Form Helpers
  const handleDayToggle = (day) => {
    setWeeklyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleAddBlockDate = () => {
    if (!newBlockDate) return;
    if (blockedDates.includes(newBlockDate)) return;
    setBlockedDates((prev) => [...prev, newBlockDate].sort());
    setNewBlockDate("");
  };

  const handleRemoveBlockDate = (dateStr) => {
    setBlockedDates((prev) => prev.filter((d) => d !== dateStr));
  };

  function onImageFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (imagePreview && imagePreview.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(imagePreview);
      } catch (err) {}
    }
    const url = URL.createObjectURL(f);
    setImagePreview(url);
    setImageFile(f);
  }

  // Unified Save Settings Function
  const handleSave = async () => {
    if (!name.trim()) {
      addToast("Service name is required.", "error");
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("about", about);
      fd.append("price", String(Number(price) || 0));
      fd.append("availability", available ? "available" : "unavailable");

      const instructionsList = instructionsText
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      fd.append("instructions", JSON.stringify(instructionsList));

      if (imageFile) {
        fd.append("image", imageFile);
      }

      // Append Availability Settings
      const availabilitySettings = {
        sessions: sessionMode,
        sessionMode: sessionMode,
        weeklyDays,
        blockedDates,
      };
      fd.append("availabilitySettings", JSON.stringify(availabilitySettings));

      const res = await fetch(`${API_BASE}/api/services/${id}`, {
        method: "PUT",
        body: fd,
      });

      const body = await res.json().catch(() => null);
      if (res.ok) {
        addToast("Service profile and settings saved successfully!", "success");
        fetchServiceData();
      } else {
        addToast(body?.message || "Failed to update service profile", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Network error while saving settings", "error");
    } finally {
      setSaving(false);
    }
  };

  // Trigger Emergency Closure Shifting
  const handleAbsence = async () => {
    if (!absenceDate) {
      addToast("Please select a date for emergency closure", "error");
      return;
    }
    const ok = window.confirm(
      `Trigger Emergency Closure for ${name} on ${absenceDate} (${absenceSession})?\nThis will automatically push and reschedule affected service bookings forward.`
    );
    if (!ok) return;

    setTriggeringAbsence(true);
    try {
      const res = await fetch(`${API_BASE}/api/services/${id}/absence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: absenceDate,
          session: absenceSession,
          // Send both keys to satisfy backend controller destructuring
          type: absenceSession === "Both" ? "full-day" : absenceSession === "Morning" ? "morning" : "afternoon"
        }),
      });

      const body = await res.json().catch(() => null);
      if (res.ok) {
        addToast(`Emergency Closure registered! Shifted ${body?.affectedAppointmentsCount || 0} service appointment(s).`, "success");
        setAbsenceDate("");
        
        // Add to blocked dates locally to reflect visually
        if (!blockedDates.includes(absenceDate)) {
          setBlockedDates((prev) => [...prev, absenceDate].sort());
        }
        fetchServiceData();
      } else {
        addToast(body?.message || "Failed to register emergency closure", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Network error registering emergency closure", "error");
    } finally {
      setTriggeringAbsence(false);
    }
  };

  // Delete Service
  const handleDeleteService = async () => {
    if (!window.confirm(`Are you sure you want to delete ${name || "this service"}? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/services/${id}`, {
        method: "DELETE",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        addToast(body?.message || "Failed to remove service", "error");
        return;
      }
      alert("Service removed successfully.");
      navigate("/list-service");
    } catch (err) {
      console.error(err);
      addToast("Network error while removing service", "error");
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <Loader2 className="w-10 h-10 animate-spin text-blue-655" />
            <p className="font-semibold text-sm">Loading service profile details...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!service) {
    return (
      <AdminLayout>
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-sm">
            <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
            <p className="text-slate-600 font-bold mb-4">Service Profile not found.</p>
            <button
              onClick={() => navigate("/list-service")}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all"
            >
              ← Back to Services
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-slate-50/50 pb-16 font-sans">
        
        {/* Floating Toast Notification */}
        {toasts.length > 0 && (
          <div className="fixed top-5 right-5 z-50 space-y-2">
            {toasts.map((t) => (
              <div
                key={t.id}
                className={`flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold text-white transition-all duration-300 ${
                  t.type === "success" ? "bg-emerald-500 animate-slideIn" : "bg-rose-500 animate-slideIn"
                }`}
              >
                {t.type === "success" ? <CheckCircle className="w-4.5 h-4.5" /> : <XCircle className="w-4.5 h-4.5" />}
                {t.message}
              </div>
            ))}
          </div>
        )}

        {/* Breadcrumb Sticky Bar */}
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200/60 shadow-xs px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate("/list-service")}
            className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors font-semibold text-sm cursor-pointer bg-transparent border-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Services List
          </button>
          <h1 className="text-slate-800 font-black text-sm sm:text-base truncate">
            Manage Service — <span className="text-blue-600">{name}</span>
          </h1>
          <div className="flex gap-2">
            <button
              onClick={handleDeleteService}
              className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all cursor-pointer border-0"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

          {/* SECTION 1: TOP PROFILE CARD */}
          <div className="bg-white rounded-3xl shadow-xs border border-slate-200/60 p-6 flex flex-col md:flex-row gap-6 items-start hover:shadow-sm transition-all duration-300">
            <div className="relative flex-shrink-0 mx-auto md:mx-0">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt={name}
                  className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover shadow-md border-3 border-blue-50/70 bg-slate-50"
                />
              ) : (
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-355 shadow-md border-3 border-blue-50/70">
                  <ImageIcon className="w-10 h-10" />
                </div>
              )}
              <span
                className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-3 border-white shadow-md ${
                  available ? "bg-emerald-400" : "bg-rose-400"
                }`}
              />
            </div>

            <div className="flex-1 min-w-0 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 mb-1.5">
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">{name || "Untitled Service"}</h2>
                <span
                  className={`text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    available
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {available ? "Available" : "Unavailable"}
                </span>
              </div>
              <p className="text-slate-500 text-sm sm:text-base line-clamp-2 max-w-2xl mb-3.5">
                {about || "No description provided."}
              </p>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-500" /> Auto-scheduled Queue
                </span>
                <span className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-500" /> {weeklyDays.length} available weekdays
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-500" /> Preference: {sessionMode === "Both" ? "Full Day" : sessionMode}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center md:text-right min-w-[140px] w-full md:w-auto flex-shrink-0">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">Service Fee</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-800">₹{price || 0}</p>
              <p className="text-[10px] text-slate-400">per appointment session</p>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* LEFT & MIDDLE COLUMNS: EDIT DETAILS */}
            <div className="lg:col-span-2 space-y-6">

              {/* SERVICE BASIC INFO EDIT CARD */}
              <div className="bg-white rounded-3xl shadow-xs border border-slate-200/60 p-6 hover:shadow-sm transition-all duration-300">
                <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-3.5">
                  <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                    <User className="w-4.5 h-4.5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">Service Profile Details</h3>
                    <p className="text-[11px] text-slate-400">Edit general name, description, pre-instructions, and cover image</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Service Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-slate-50"
                        placeholder="Service Name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Consultation / Service Fee (₹)</label>
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-slate-50"
                        placeholder="Service Fee"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Availability Status</label>
                    <select
                      value={available ? "true" : "false"}
                      onChange={(e) => setAvailable(e.target.value === "true")}
                      className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-slate-50 cursor-pointer"
                    >
                      <option value="true">Available</option>
                      <option value="false">Unavailable</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">About Service Description</label>
                    <textarea
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-slate-50 h-28 resize-none"
                      placeholder="Describe the medical service or procedure..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Pre-Instructions (One per line)</label>
                    <textarea
                      value={instructionsText}
                      onChange={(e) => setInstructionsText(e.target.value)}
                      className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-slate-50 h-32"
                      placeholder="Avoid heavy meals&#10;Bring previous prescriptions..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Service Cover Image</label>
                    <div className="flex items-center gap-3">
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        onChange={onImageFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileRef.current.click()}
                        className="px-4 py-2 border border-slate-200 hover:border-slate-350 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer bg-white"
                      >
                        Change Cover Image
                      </button>
                      {imageFile && (
                        <span className="text-xs text-slate-500 italic truncate max-w-xs">{imageFile.name}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: AVAILABILITY SETTINGS & CLOSURE */}
            <div className="space-y-6">

              {/* AVAILABILITY PREFERENCES & WEEKLY DAYS CARD */}
              <div className="bg-white rounded-3xl shadow-xs border border-slate-200/60 p-6 hover:shadow-sm transition-all duration-300 space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5">
                  <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <Shield className="w-4.5 h-4.5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">Availability Controls</h3>
                    <p className="text-[11px] text-slate-400">Control preferences, hours & calendar blocks</p>
                  </div>
                </div>

                {/* Session Preference */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Session Preference</label>
                  <select
                    value={sessionMode}
                    onChange={(e) => setSessionMode(e.target.value)}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-slate-50 cursor-pointer"
                  >
                    <option value="Morning">Morning Only (10:30 AM – 1:30 PM)</option>
                    <option value="Afternoon">Afternoon Only (2:30 PM – 7:30 PM)</option>
                    <option value="Both">Both Sessions (Full Day)</option>
                  </select>
                </div>

                {/* Weekly Availability */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Weekly Availability Days</label>
                  <div className="grid grid-cols-2 gap-2">
                    {DAYS_OF_WEEK.map((day) => {
                      const active = weeklyDays.includes(day);
                      return (
                        <button
                          key={day}
                          onClick={() => handleDayToggle(day)}
                          type="button"
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer bg-white ${
                            active
                              ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs"
                              : "bg-slate-50 border-slate-200 text-slate-500 hover:border-emerald-200"
                          }`}
                        >
                          <span
                            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                              active ? "bg-emerald-400 animate-pulse" : "bg-slate-350"
                            }`}
                          />
                          {day.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Blocked Dates */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Blocked Dates</label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="date"
                      value={newBlockDate}
                      onChange={(e) => setNewBlockDate(e.target.value)}
                      className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-slate-50 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={handleAddBlockDate}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer border-0"
                    >
                      Block
                    </button>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
                    {blockedDates.length === 0 ? (
                      <p className="text-[11px] text-slate-400 text-center py-4 italic">No blocked dates configured.</p>
                    ) : (
                      blockedDates.map((d) => (
                        <div
                          key={d}
                          className="flex items-center justify-between bg-white border border-slate-100 px-3 py-1.5 rounded-lg shadow-2xs"
                        >
                          <span className="text-xs text-slate-700 font-bold">{formatDateISO(d)}</span>
                          <button
                            onClick={() => handleRemoveBlockDate(d)}
                            type="button"
                            className="text-rose-500 hover:text-rose-700 text-sm font-black cursor-pointer leading-none px-1 border-0 bg-transparent"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Save Button (availability card specific, updates everything) */}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer border-0"
                >
                  {saving ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Save className="w-4.5 h-4.5" />}
                  Save Availability Settings
                </button>
              </div>

              {/* EMERGENCY CLOSURE RESCHEDULING CARD */}
              <div className="bg-rose-50/70 border border-rose-200/80 rounded-3xl p-6 hover:shadow-sm transition-all duration-300 space-y-5 shadow-xs">
                <div className="flex items-center gap-3 border-b border-rose-200/50 pb-3.5">
                  <div className="w-9 h-9 bg-rose-100 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-4.5 h-4.5 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-rose-800 text-sm sm:text-base">Emergency Closure</h3>
                    <p className="text-[11px] text-rose-600">Absence shifting tool for bookings</p>
                  </div>
                </div>

                <div className="bg-white border border-rose-200/70 p-4 rounded-2xl shadow-2xs">
                  <p className="text-xs text-rose-700 leading-relaxed font-semibold">
                    ⚠️ Triggering a closure blocks the date/session immediately. All affected patient bookings are <strong>rescheduled forward</strong> in sequential booking order.
                  </p>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-rose-700 mb-1.5">Closure Date</label>
                    <input
                      type="date"
                      value={absenceDate}
                      onChange={(e) => setAbsenceDate(e.target.value)}
                      className="w-full text-xs sm:text-sm border border-rose-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-200 bg-white cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-rose-700 mb-1.5">Session to Close</label>
                    <select
                      value={absenceSession}
                      onChange={(e) => setAbsenceSession(e.target.value)}
                      className="w-full text-xs sm:text-sm border border-rose-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-200 bg-white cursor-pointer"
                    >
                      <option value="Morning">Morning Only (10:30 AM – 1:30 PM)</option>
                      <option value="Afternoon">Afternoon Only (2:30 PM – 7:30 PM)</option>
                      <option value="Both">Both Sessions (Full Day)</option>
                    </select>
                  </div>

                  <button
                    onClick={handleAbsence}
                    disabled={triggeringAbsence || !absenceDate}
                    type="button"
                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white font-extrabold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider border-0"
                  >
                    {triggeringAbsence ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Rescheduling Appointments...
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4.5 h-4.5" /> Trigger Emergency Closure
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>
    </AdminLayout>
  );
}
