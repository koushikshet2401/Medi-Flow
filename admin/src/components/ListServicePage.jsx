<<<<<<< HEAD
import React, { useState, useRef, useEffect } from "react";
=======
/**
 * ListServicePage.jsx
 * Compact service list with:
 *  - Lightweight service cards (image + name + price + badge + slot count)
 *  - Small dropdown preview (ServiceQuickPreview — read-only)
 *  - "Manage →" button navigating to /service/:id for all admin controls
 *  - Delete action with confirmation
 *  - Search + filter controls
 *  - Built-in toast notification system
 */
import React, { useState, useEffect } from "react";
>>>>>>> 9ccc40b2616421a52cce35c6ff80f52d9a79a5c5
import { useNavigate } from "react-router-dom";
import {
  Image as ImageIcon,
  Trash2,
  Check,
  X,
  ChevronRight,
  Search,
  Calendar,
  Settings,
} from "lucide-react";
import { serviceListStyles as s } from "../assets/dummyStyles";
import ServiceQuickPreview from "./ServiceQuickPreview";

const API_BASE =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:4000"
    : "https://medi-flow-backend.onrender.com";

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function ListServicePage() {
  const navigate = useNavigate();
<<<<<<< HEAD
  const API_BASE = "https://medi-flow-backend.onrender.com";
=======
>>>>>>> 9ccc40b2616421a52cce35c6ff80f52d9a79a5c5

  const [services, setServices] = useState([]);
  const [openDetails, setOpenDetails] = useState({});
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState("all");

  // ── Toasts ──────────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState([]);
  function addToast(message, type = "success", ttl = 3000) {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl);
  }

  // ── Slot conversion helpers ──────────────────────────────────────────────────
  function convertSlotsForUI(slotStrings = []) {
    return (slotStrings || []).map((rawSlot, idx) => {
      const raw = String(rawSlot || "");

      // "DD Mon YYYY • HH:MM AM/PM"
      const m = raw.match(
        /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s*•\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i
      );
      if (m) {
        const mi = months.findIndex(
          (mm) => mm.toLowerCase() === m[2].toLowerCase()
        );
        const monthNum = mi >= 0 ? String(mi + 1).padStart(2, "0") : "01";
        return {
          id: `s-${idx}`,
          date: `${m[3]}-${monthNum}-${m[1].padStart(2, "0")}`,
          raw,
        };
      }

      // ISO datetime
      const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
      if (iso) return { id: `s-${idx}`, date: iso[1], raw };

      return { id: `s-${idx}`, date: "", raw };
    });
  }

  function convertSlotsMapToArray(slotsMap) {
    try {
      const out = [];
      if (slotsMap instanceof Map) {
        for (const [date, arr] of slotsMap.entries()) {
          (arr || []).forEach((t, idx) =>
            out.push({ id: `${date}-${idx}`, date, raw: t })
          );
        }
      } else {
        for (const date of Object.keys(slotsMap || {})) {
          (slotsMap[date] || []).forEach((t, idx) =>
            out.push({ id: `${date}-${idx}`, date, raw: t })
          );
        }
      }
      return out;
    } catch (_) {
      return [];
    }
  }

  // ── Fetch services ───────────────────────────────────────────────────────────
  async function fetchServices() {
    try {
      const res = await fetch(`${API_BASE}/api/services`);
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        addToast("Failed to load services", "error");
        setServices([]);
        return;
      }
      const items = (body && (body.data || body.services || body.items)) || [];
      const normalized = items.map((svc) => ({
        id: svc._id || svc.id,
        name: svc.name,
        about: svc.about || "",
        instructions: Array.isArray(svc.instructions)
          ? svc.instructions
          : Array.isArray(svc.preInstructions)
          ? svc.preInstructions
          : [],
        price: svc.price ?? svc.fee ?? 0,
        available: svc.available ?? svc.availability === "Available",
        image:
          svc.image || svc.imageUrl || svc.imageSrc || svc.imageSmall || "",
        slots: Array.isArray(svc.slots)
          ? convertSlotsForUI(svc.slots)
          : svc.slots && typeof svc.slots === "object"
          ? convertSlotsMapToArray(svc.slots)
          : [],
        _raw: svc,
      }));
      setServices(normalized);
    } catch (err) {
      console.error("fetchServices error", err);
      addToast("Network error while loading services", "error");
      setServices([]);
    }
  }

  useEffect(() => {
    fetchServices();
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function toggleDetails(id) {
    setOpenDetails((prev) => ({ [id]: !prev[id] }));
  }

  async function removeService(id) {
    if (!window.confirm("Are you sure you want to remove this service?"))
      return;
    try {
      const res = await fetch(`${API_BASE}/api/services/${id}`, {
        method: "DELETE",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        addToast(body?.message || "Failed to remove service", "error");
        return;
      }
      setServices((list) => list.filter((x) => x.id !== id));
      setOpenDetails({});
      addToast("Service removed", "success");
    } catch (err) {
      addToast("Network error while removing", "error");
    }
  }

  // ── Filtered list ────────────────────────────────────────────────────────────
  const filtered = services
    .filter((svc) =>
      svc.name.toLowerCase().includes(search.trim().toLowerCase())
    )
    .filter((svc) => {
      if (filterMode === "all") return true;
      if (filterMode === "available") return svc.available === true;
      if (filterMode === "unavailable") return svc.available === false;
      return true;
    });

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className={s.pageContainer}>
      {/* Header */}
      <div className={s.headerContainer}>
        <div className="w-full md:w-auto">
          <h1 className={s.headerTitle}>Services</h1>
          <p className={s.headerSubtitle}>
            Manage your services — click a card to preview, or Manage to edit
          </p>
        </div>

        <div className={s.filterContainer}>
          <div className={s.filterButtonsContainer}>
            {["all", "available", "unavailable"].map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`${s.filterButton} ${
                  filterMode === mode
                    ? s.filterButtonActive
                    : s.filterButtonInactive
                } ${s.cursorPointer}`}
                type="button"
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          <div className={s.searchContainer}>
            <div className={s.searchIcon}>
              <Search className={s.searchIconSvg} />
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services…"
              className={s.searchInput}
            />
          </div>
        </div>
      </div>

      {/* Service cards grid */}
      <div className={s.servicesGrid}>
        {filtered.map((svc) => {
          const isOpen = !!openDetails[svc.id];

          return (
            <div key={svc.id} className={s.serviceCard}>
              {/* ── Compact card header (click = toggle preview) ── */}
              <div
                className={s.serviceCardContent}
                onClick={() => navigate(`/service/${svc.id}`)}
              >
                {/* Thumbnail */}
                <div className={s.serviceImageContainer}>
                  {svc.image ? (
                    <img
                      src={svc.image}
                      alt={svc.name}
                      className={s.serviceImage}
                    />
                  ) : (
                    <div className={s.serviceImagePlaceholder}>
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className={s.serviceInfoContainer}>
                  <div className={s.serviceHeader}>
                    <div className="min-w-0">
                      <h2 className={s.serviceName}>{svc.name}</h2>
                      {svc.about && (
                        <p className={s.serviceDescription}>{svc.about}</p>
                      )}
                    </div>

                    <div className={s.servicePriceContainer}>
                      <div className={s.servicePrice}>₹{svc.price}</div>
                      <div
                        className={`${s.availabilityBadge} ${
                          svc.available
                            ? s.availabilityAvailable
                            : s.availabilityUnavailable
                        }`}
                      >
                        {svc.available ? (
                          <>
                            <Check className="w-3 h-3" /> Available
                          </>
                        ) : (
                          <>
                            <X className="w-3 h-3" /> Unavailable
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Slot count */}
                  <div className={s.slotsInfo}>
                    <Calendar className="w-4 h-4" />
                    <span>
                      {svc.slots.length} slot
                      {svc.slots.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Chevron */}
                <div className={s.chevronContainer}>
                  <ChevronRight
                    className="w-6 h-6 text-sky-350"
                  />
                </div>
              </div>

              {/* ── Dropdown preview (read-only) ── */}
              {isOpen && (
                <div className={s.detailsContainer}>
                  {/* Divider */}
                  <div className="border-t border-sky-50 mb-3" />

                  {/* Read-only quick preview */}
                  <ServiceQuickPreview service={svc} />

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-4 pt-3 border-t border-sky-50">
                    {/* Manage → navigates to edit page */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/service/${svc.id}`);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
                    >
                      <Settings className="w-4 h-4" />
                      Manage Service
                    </button>

                    {/* Delete */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeService(svc.id);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-sm font-semibold transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className={s.emptyState}>No services match your search.</div>
      )}

      {/* ── Toast container ─────────────────────────────────────────────────── */}
      <div className={s.toastContainerBottom}>
        {toasts.map((t) => (
          <div key={t.id} className={s.toast}>
            <div
              className={`${s.toastInner} ${
                t.type === "success" ? s.toastSuccess : s.toastError
              }`}
            >
              <div className={s.toastContent}>
                <div
                  className={
                    t.type === "success" ? s.toastIconSuccess : s.toastIconError
                  }
                >
                  <Check className={s.toastIconSvg} />
                </div>
                <div className={s.toastMessage}>{t.message}</div>
                <button
                  onClick={() =>
                    setToasts((prev) => prev.filter((x) => x.id !== t.id))
                  }
                  className={s.toastCloseButton}
                >
                  <X className={s.toastCloseIcon} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}