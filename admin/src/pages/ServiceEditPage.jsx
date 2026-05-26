/**
 * ServiceEditPage.jsx
 * Dedicated management page for a single service.
 * Mirrors DoctorEditPage architecture but is purpose-built for services.
 *
 * Route: /service/:id  OR  /list-service/service/:id
 *
 * Sections:
 *   1. Service header info (name, price, image, about, instructions, availability toggle)
 *   2. Availability Settings (shared AvailabilityPanel)
 *   3. Emergency Closure (shared EmergencyClosurePanel)
 */
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import AdminLayout from "../components/AdminLayout";
import AvailabilityPanel from "../components/shared/AvailabilityPanel";
import EmergencyClosurePanel from "../components/shared/EmergencyClosurePanel";
import { apiFetch, API_BASE } from "../utils/axiosInstance";
import {
  ArrowLeft,
  Save,
  AlertTriangle,
  Loader2,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  Edit3,
} from "lucide-react";

export default function ServiceEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const fileRef = useRef();

  // ── Core state ─────────────────────────────────────────────────────────────
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [toast, setToast] = useState(null); // { msg, type }

  // ── Info form state ─────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [instructionsText, setInstructionsText] = useState("");
  const [price, setPrice] = useState("");
  const [available, setAvailable] = useState(true);
  const [imagePreview, setImagePreview] = useState("");
  const [imageFile, setImageFile] = useState(null);

  // ── Availability panel state ────────────────────────────────────────────────
  const [sessionMode, setSessionMode] = useState("Both");
  const [weeklyDays, setWeeklyDays] = useState([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ]);
  const [blockedDates, setBlockedDates] = useState([]);

  // ── Emergency closure state ─────────────────────────────────────────────────
  const [absenceDate, setAbsenceDate] = useState("");
  const [absenceSession, setAbsenceSession] = useState("Both");
  const [triggeringAbsence, setTriggeringAbsence] = useState(false);

  // ── Toast helper ────────────────────────────────────────────────────────────
  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Fetch service data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API_BASE}/api/services/${id}`)
      .then((r) => r.json())
      .then((payload) => {
        const svc = payload?.data || payload?.service || payload || null;
        if (!svc || (!svc._id && !svc.id)) {
          showToast("Service not found", "error");
          return;
        }
        setService(svc);
        // Populate info fields
        setName(svc.name || "");
        setAbout(svc.about || "");
        setInstructionsText(
          Array.isArray(svc.instructions)
            ? svc.instructions.join("\n")
            : svc.preInstructions
            ? svc.preInstructions.join("\n")
            : ""
        );
        setPrice(String(svc.price ?? svc.fee ?? ""));
        setAvailable(svc.available ?? svc.availability === "Available" ?? true);
        setImagePreview(
          svc.imageUrl || svc.image || svc.imageSrc || ""
        );
        // Populate availability
        const avail = svc.availabilitySettings || {};
        setSessionMode(avail.sessionMode || avail.sessions || "Both");
        setWeeklyDays(
          avail.weeklyDays?.length
            ? avail.weeklyDays
            : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        );
        setBlockedDates(
          Array.isArray(avail.blockedDates) ? avail.blockedDates : []
        );
      })
      .catch(() => showToast("Failed to load service", "error"))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Image file handler ──────────────────────────────────────────────────────
  function onImageChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(f));
    setImageFile(f);
  }

  // ── Save basic info ─────────────────────────────────────────────────────────
  async function handleSaveInfo() {
    setSavingInfo(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("about", about.trim());
      fd.append("price", String(Number(price) || 0));
      fd.append("availability", available ? "available" : "unavailable");
      const instructions = instructionsText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      fd.append("instructions", JSON.stringify(instructions));
      if (imageFile) fd.append("image", imageFile);

      const res = await apiFetch(`/api/services/${id}`, {
        method: "PUT",
        body: fd,
      }, getToken);

      if (!res) return; // redirected by apiFetch on 401

      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast("Service info saved successfully!", "success");
        setService(body?.data || body?.service || service);
        setImageFile(null);
      } else {
        showToast(body?.message || "Failed to save service info", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error — please try again", "error");
    } finally {
      setSavingInfo(false);
    }
  }

  // ── Save availability settings ──────────────────────────────────────────────
  async function handleSaveAvailability() {
    setSavingAvailability(true);
    try {
      const res = await apiFetch(`/api/services/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availabilitySettings: JSON.stringify({
            sessionMode,
            weeklyDays,
            blockedDates,
          }),
        }),
      }, getToken);

      if (!res) return;

      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast("Availability settings saved!", "success");
      } else {
        showToast(body?.message || "Failed to save availability", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error — please try again", "error");
    } finally {
      setSavingAvailability(false);
    }
  }

  // ── Trigger emergency closure ───────────────────────────────────────────────
  async function handleAbsence() {
    if (!absenceDate) {
      showToast("Please select a date for closure", "error");
      return;
    }
    const confirmed = window.confirm(
      `Trigger Emergency Closure for "${name}" on ${absenceDate} (${absenceSession} session)?\n\nAll affected bookings will be automatically rescheduled forward.`
    );
    if (!confirmed) return;

    setTriggeringAbsence(true);
    try {
      const res = await apiFetch(`/api/services/${id}/absence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: absenceDate, session: absenceSession }),
      }, getToken);

      if (!res) return;

      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(
          `Closure registered! ${body?.affectedAppointmentsCount ?? 0} booking(s) rescheduled.`,
          "success"
        );
        setAbsenceDate("");
        if (!blockedDates.includes(absenceDate)) {
          setBlockedDates((prev) => [...prev, absenceDate].sort());
        }
      } else {
        showToast(body?.message || "Failed to register closure", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error — please try again", "error");
    } finally {
      setTriggeringAbsence(false);
    }
  }

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <Loader2 className="w-10 h-10 animate-spin text-sky-500" />
            <p className="font-semibold text-sm">Loading service details…</p>
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
            <p className="text-slate-600 font-bold mb-4">Service not found.</p>
            <button
              onClick={() => navigate("/list-service")}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-sm transition-all"
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
        {/* ── Floating Toast ─────────────────────────────────────────────────── */}
        {toast && (
          <div
            className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold text-white transition-all duration-300 ${
              toast.type === "success"
                ? "bg-emerald-500 animate-slideIn"
                : "bg-rose-500 animate-slideIn"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle className="w-4.5 h-4.5" />
            ) : (
              <XCircle className="w-4.5 h-4.5" />
            )}
            {toast.msg}
          </div>
        )}

        {/* ── Sticky breadcrumb bar ───────────────────────────────────────────── */}
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200/60 shadow-xs px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate("/list-service")}
            className="flex items-center gap-2 text-slate-600 hover:text-sky-600 transition-colors font-semibold text-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Services</span>
          </button>
          <div className="text-xs text-slate-400 hidden sm:block">
            Services /{" "}
            <span className="font-semibold text-slate-600">{name}</span>
          </div>
        </div>

        {/* ── Main content ───────────────────────────────────────────────────── */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

          {/* ── 1. Service Info Card ──────────────────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Section header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
              <Edit3 className="w-5 h-5 text-sky-500" />
              <h2 className="font-bold text-slate-800 text-base">
                Basic Information
              </h2>
            </div>

            <div className="p-6 space-y-5">
              {/* Image + name row */}
              <div className="flex flex-col sm:flex-row gap-5">
                {/* Image */}
                <div className="flex-shrink-0">
                  <div
                    className="w-28 h-28 rounded-2xl overflow-hidden bg-sky-50 border border-sky-100 flex items-center justify-center cursor-pointer hover:opacity-80 transition"
                    onClick={() => fileRef.current?.click()}
                    title="Click to change image"
                  >
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt={name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-sky-300" />
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onImageChange}
                  />
                  <p className="text-xs text-slate-400 mt-1.5 text-center">
                    Click to change
                  </p>
                </div>

                {/* Name + price + availability */}
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                      Service Name
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 bg-white"
                      placeholder="Service name…"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                        Price (₹)
                      </label>
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 bg-white"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                        Availability
                      </label>
                      <select
                        value={available ? "true" : "false"}
                        onChange={(e) =>
                          setAvailable(e.target.value === "true")
                        }
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 bg-white cursor-pointer"
                      >
                        <option value="true">Available</option>
                        <option value="false">Unavailable</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* About */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  About
                </label>
                <textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 bg-white resize-none"
                  placeholder="Brief description of the service…"
                />
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Pre-Visit Instructions{" "}
                  <span className="normal-case font-normal text-slate-400">
                    (one per line)
                  </span>
                </label>
                <textarea
                  value={instructionsText}
                  onChange={(e) => setInstructionsText(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 bg-white resize-none font-mono"
                  placeholder={"Fast for 4 hours before\nBring ID proof\nWear comfortable clothing"}
                />
              </div>

              {/* Save info button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveInfo}
                  disabled={savingInfo}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold text-sm transition cursor-pointer shadow-sm"
                >
                  {savingInfo ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {savingInfo ? "Saving…" : "Save Basic Info"}
                </button>
              </div>
            </div>
          </section>

          {/* ── 2. Shared Availability Panel ────────────────────────────────── */}
          <AvailabilityPanel
            sessionMode={sessionMode}
            setSessionMode={setSessionMode}
            weeklyDays={weeklyDays}
            setWeeklyDays={setWeeklyDays}
            blockedDates={blockedDates}
            setBlockedDates={setBlockedDates}
            saving={savingAvailability}
            onSave={handleSaveAvailability}
          />

          {/* ── 3. Shared Emergency Closure Panel ───────────────────────────── */}
          <EmergencyClosurePanel
            entityName={name}
            absenceDate={absenceDate}
            setAbsenceDate={setAbsenceDate}
            absenceSession={absenceSession}
            setAbsenceSession={setAbsenceSession}
            triggering={triggeringAbsence}
            onTrigger={handleAbsence}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
