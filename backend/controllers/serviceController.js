import Service from "../models/Service.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

//helper
const parseJsonArrayField = (field) => {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  if (typeof field === "string") {
    try {
      const parsed = JSON.parse(field);
      if (Array.isArray(parsed)) return parsed;
      return typeof parsed === "string" ? [parsed] : [];
    } catch {
      return field
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
};

function normalizeSlotsToMap(slotStrings = []) {
  const map = {};
  slotStrings.forEach((raw) => {
    const m = raw.match(
      /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s*•\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i,
    );
    if (!m) {
      map["unspecified"] = map["unspecified"] || [];
      map["unspecified"].push(raw);
      return;
    }
    const [, day, monShort, year, hour, minute, ampm] = m;
    const monthIdx = [
      "Jan","Feb","Mar","Apr","May","Jun",
      "Jul","Aug","Sep","Oct","Nov","Dec",
    ].findIndex((x) => x.toLowerCase() === monShort.toLowerCase());

    const mm = String(monthIdx + 1).padStart(2, "0");
    const dd = String(Number(day)).padStart(2, "0");

    const dateKey = `${year}-${mm}-${dd}`;
    const timeStr = `${String(Number(hour)).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${ampm.toUpperCase()}`;

    map[dateKey] = map[dateKey] || [];
    map[dateKey].push(timeStr);
  });
  return map;
}

const sanitizePrice = (v) =>
  Number(String(v ?? "0").replace(/[^\d.-]/g, "")) || 0;

const parseAvailability = (v) => {
  const s = String(v ?? "available").toLowerCase();
  return s === "available" || s === "true";
};

// CREATE
export async function createService(req, res) {
  try {
    const b = req.body || {};
    const instructions = parseJsonArrayField(b.instructions);
    const rawSlots = parseJsonArrayField(b.slots);
    const slots = normalizeSlotsToMap(rawSlots);
    const numericPrice = sanitizePrice(b.price);
    const available = parseAvailability(b.availability);

    let imageUrl = null;
    let imagePublicId = null;

    if (req.file) {
      try {
        const up = await uploadToCloudinary(req.file.path, "services");
        imageUrl = up?.secure_url || null;
        imagePublicId = up?.public_id || null;
      } catch (err) {
        console.error("Cloudinary upload error:", err);
      }
    }

    const service = new Service({
      name: b.name,
      about: b.about || "",
      shortDescription: b.shortDescription || "",
      price: numericPrice,
      available,
      instructions,
      slots,
      imageUrl,
      imagePublicId,
    });

    const saved = await service.save();

    return res.status(201).json({
      success: true,
      data: saved,
      message: "Service Created",
    });

  } catch (err) {
    console.error("Create Service Error", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

// GET ALL
export async function getServices(req, res) {
  try {
    const list = await Service.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, data: list });
  } catch (err) {
    console.error("Get Service Error", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

// GET BY ID
export async function getServiceById(req, res) {
  try {
    const { id } = req.params;
    const service = await Service.findById(id).lean();

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "service not found",
      });
    }

    return res.status(200).json({ success: true, data: service });

  } catch (err) {
    console.error("Get Service BY Id Error", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

// UPDATE
export async function UpdateService(req, res) {
  try {
    const { id } = req.params;
    const existing = await Service.findById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "service not found",
      });
    }

    const b = req.body || {};
    const updateData = {};

    if (b.name !== undefined) updateData.name = b.name;
    if (b.about !== undefined) updateData.about = b.about;
    if (b.shortDescription !== undefined) updateData.shortDescription = b.shortDescription;
    if (b.price !== undefined) updateData.price = sanitizePrice(b.price);
    if (b.availability !== undefined) updateData.available = parseAvailability(b.availability);
    if (b.instructions !== undefined) updateData.instructions = parseJsonArrayField(b.instructions);
    if (b.slots !== undefined) updateData.slots = normalizeSlotsToMap(parseJsonArrayField(b.slots));

    if (b.availabilitySettings !== undefined) {
      let settings = b.availabilitySettings;
      if (typeof settings === "string") {
        try {
          settings = JSON.parse(settings);
        } catch (e) {
          settings = null;
        }
      }
      if (settings) {
        updateData.availabilitySettings = {
          sessions: settings.sessions ?? existing.availabilitySettings?.sessions ?? "Both",
          weeklyDays: settings.weeklyDays ?? existing.availabilitySettings?.weeklyDays ?? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          blockedDates: settings.blockedDates ?? existing.availabilitySettings?.blockedDates ?? [],
          partialDayAvailability: settings.partialDayAvailability ?? existing.availabilitySettings?.partialDayAvailability ?? {},
        };
      }
    }

    if (req.file) {
      try {
        const up = await uploadToCloudinary(req.file.path, "services");

        if (up?.secure_url) {
          updateData.imageUrl = up.secure_url;
          updateData.imagePublicId = up.public_id || null;

          if (existing.imagePublicId) {
            try {
              await deleteFromCloudinary(existing.imagePublicId);
            } catch (err) {
              console.warn("Cloudinary delete failed:", err?.message || err);
            }
          }
        }
      } catch (err) {
        console.error("Cloudinary upload error:", err);
      }
    }

    const updated = await Service.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      data: updated,
      message: "Service Updated",
    });

  } catch (err) {
    console.error("Update Service Error", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

// to trigger service emergency absence and reschedule affected bookings
export async function triggerServiceAbsence(req, res) {
  try {
    const { id } = req.params;
    const { date, type, untilSlot } = req.body || {};

    if (!date || !type) {
      return res.status(400).json({ success: false, message: "date and type are required" });
    }

    const svc = await Service.findById(id);
    if (!svc) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    if (!svc.availabilitySettings) {
      svc.availabilitySettings = {
        sessions: "Both",
        weeklyDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        blockedDates: [],
        partialDayAvailability: {},
      };
    }

    if (type === "full-day") {
      if (!svc.availabilitySettings.blockedDates.includes(date)) {
        svc.availabilitySettings.blockedDates.push(date);
      }
    } else {
      if (!svc.availabilitySettings.partialDayAvailability) {
        svc.availabilitySettings.partialDayAvailability = {};
      }
      
      let limitSlot = "09:30 AM";
      if (type === "morning") {
        limitSlot = "02:30 PM";
      } else if (type === "afternoon") {
        limitSlot = "02:30 PM";
      } else if (type === "partial") {
        limitSlot = untilSlot;
      }

      if (svc.availabilitySettings.partialDayAvailability instanceof Map) {
        svc.availabilitySettings.partialDayAvailability.set(date, limitSlot);
      } else {
        svc.availabilitySettings.partialDayAvailability[date] = limitSlot;
      }
    }

    svc.markModified("availabilitySettings");
    await svc.save();

    const { rescheduleForAbsence } = await import("../utils/slotHelper.js");
    const result = await rescheduleForAbsence(id, "service", { date, type, untilSlot });

    return res.json({
      success: true,
      message: `Absence triggered on ${date} and ${result.count} appointments auto-rescheduled.`,
      availabilitySettings: svc.availabilitySettings,
    });
  } catch (err) {
    console.error("triggerServiceAbsence error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// DELETE
export async function deleteService(req, res) {
  try {
    const { id } = req.params;
    const existing = await Service.findById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Services not found ",
      });
    }

    if (existing.imagePublicId) {
      try {
        await deleteFromCloudinary(existing.imagePublicId);
      } catch (error) {
        console.warn(
          "Failed To Delete image from cloudinary:",
          error?.message || error
        );
      }
    }

    await existing.deleteOne();

    return res.status(200).json({
      success: true,
      message: "service Deleted",
    });

  } catch (err) {
    console.error("Delete Service Error", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

// to retrieve dynamically generated slots for client booking (services)
export async function getServiceAvailableSlots(req, res) {
  try {
    const { id } = req.params;
    const svc = await Service.findById(id).lean();
    if (!svc) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    const { getSlotsForSettings, getAvailableSlots } = await import("../utils/slotHelper.js");

    const dates = [];
    const slotsMap = {};
    const today = new Date();

    // Check if current time is past 7:30 PM (19:30)
    const isPastClosingTime = today.getHours() > 19 || (today.getHours() === 19 && today.getMinutes() >= 30);

    for (let i = 0; i < 14; i++) {
      if (i === 0 && isPastClosingTime) continue;

      const dt = new Date(today);
      dt.setDate(today.getDate() + i);
      const dateStr = dt.toISOString().split("T")[0];

      const allSlots = getSlotsForSettings(dateStr, svc.availabilitySettings, "service");
      if (allSlots.length === 0) continue;

      const info = await getAvailableSlots(id, "service", dateStr);
      dates.push(dateStr);
      slotsMap[dateStr] = {
        allSlots: info.allSlots,
        availableSlots: info.availableSlots,
        bookedSlots: info.bookedSlots,
      };
    }

    return res.json({
      success: true,
      dates,
      slots: slotsMap,
      blockedDates: svc.availabilitySettings?.blockedDates || [],
      availabilitySettings: svc.availabilitySettings,
    });
  } catch (err) {
    console.error("getServiceAvailableSlots error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
