import Doctor from "../models/Doctor.js";
import Service from "../models/Service.js";
import Appointment from "../models/Appointment.js";
import ServiceAppointment from "../models/serviceAppointment.js";
import Notification from "../models/Notification.js";
import { sendSMS } from "./smsHelper.js";
import { sendEmail } from "./emailHelper.js";
import { clerkClient } from "@clerk/clerk-sdk-node";

export const ALL_MORNING_SLOTS = ["09:30 AM", "10:30 AM", "11:30 AM", "12:30 PM"];
export const ALL_AFTERNOON_SLOTS = ["02:30 PM", "03:30 PM", "04:30 PM"];
export const ALL_SLOTS = [...ALL_MORNING_SLOTS, ...ALL_AFTERNOON_SLOTS];

// Convert time to minutes since midnight
export function parseTimeToMinutes(t = "") {
  const [time = "0:00", ampm = ""] = (t || "").split(" ");
  const [hh = 0, mm = 0] = time.split(":").map(Number);
  let h = hh % 12;
  if ((ampm || "").toUpperCase() === "PM") h += 12;
  if ((ampm || "").toUpperCase() === "AM" && hh === 12) h = 0;
  return h * 60 + (mm || 0);
}

// Convert slot string ("09:30 AM") to hour/minute/ampm
export function parseSlotString(slotStr) {
  const [time = "09:30", ampm = "AM"] = slotStr.split(" ");
  const [h = 9, m = 30] = time.split(":").map(Number);
  return { hour: h, minute: m, ampm };
}

// Format hour/minute/ampm to slot string
export function formatSlotString(hour, minute, ampm) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${ampm}`;
}

/**
 * Helper to notify patient of rescheduling/shifting.
 */
export async function notifyPatient(appointment, title, message) {
  try {
    const userId = appointment.createdBy;
    if (userId) {
      await Notification.create({
        userId,
        title,
        message,
        type: "reschedule",
      });
    }

    if (appointment.mobile) {
      await sendSMS(appointment.mobile, message);
    }

    let email = null;
    if (userId) {
      try {
        const user = await clerkClient.users.getUser(userId);
        email = user.emailAddresses?.[0]?.emailAddress;
      } catch (err) {
        console.warn("Clerk lookup failed for email notification:", err.message);
      }
    }
    if (email) {
      await sendEmail(email, title, message);
    }
  } catch (err) {
    console.error("Failed to notify patient:", err);
  }
}

/**
 * Generates slots for a given date based on availability settings.
 */
export function getSlotsForSettings(dateStr, settings) {
  if (!settings) {
    return ALL_SLOTS;
  }

  // 1. Specific Date Blocking
  if (settings.blockedDates && settings.blockedDates.includes(dateStr)) {
    return [];
  }

  // 2. Weekly Day Availability
  const dt = new Date(dateStr + "T00:00:00");
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = weekdays[dt.getDay()];
  if (settings.weeklyDays && !settings.weeklyDays.includes(dayName)) {
    return [];
  }

  // 3. Sessions
  let slots = [];
  const sess = settings.sessions || "Both";
  if (sess === "Morning" || sess === "Both") {
    slots = slots.concat(ALL_MORNING_SLOTS);
  }
  if (sess === "Afternoon" || sess === "Both") {
    slots = slots.concat(ALL_AFTERNOON_SLOTS);
  }

  // 4. Partial Day limits
  if (settings.partialDayAvailability) {
    // Check if there is a limit for this date
    // partialDayAvailability is a Map, retrieve standard JS object entries
    let limitStr = null;
    if (settings.partialDayAvailability instanceof Map) {
      limitStr = settings.partialDayAvailability.get(dateStr);
    } else {
      limitStr = settings.partialDayAvailability[dateStr];
    }

    if (limitStr) {
      const limitMinutes = parseTimeToMinutes(limitStr);
      // Keeps slots whose start time is strictly less than the limitMinutes
      slots = slots.filter((s) => parseTimeToMinutes(s) < limitMinutes);
    }
  }

  return slots;
}

/**
 * Returns available slots for a given doctor/service on a given date.
 */
export async function getAvailableSlots(entityId, entityType, dateStr) {
  let settings = null;
  let bookedSlots = [];

  if (entityType === "doctor") {
    const doc = await Doctor.findById(entityId).lean();
    if (doc) settings = doc.availabilitySettings;

    const appointments = await Appointment.find({
      doctorId: entityId,
      date: dateStr,
      status: { $in: ["Pending", "Confirmed", "Rescheduled"] },
    }).lean();

    bookedSlots = appointments.map((a) => a.time);
  } else {
    const svc = await Service.findById(entityId).lean();
    if (svc) settings = svc.availabilitySettings;

    const appointments = await ServiceAppointment.find({
      serviceId: entityId,
      date: dateStr,
      status: { $in: ["Pending", "Confirmed", "Rescheduled"] },
    }).lean();

    bookedSlots = appointments.map((a) => formatSlotString(a.hour, a.minute, a.ampm));
  }

  const allSlots = getSlotsForSettings(dateStr, settings);
  const availableSlots = allSlots.filter((s) => !bookedSlots.includes(s));

  return {
    allSlots,
    availableSlots,
    bookedSlots,
  };
}

/**
 * Automatic Slot Reordering After Cancellation.
 * Shifts subsequent appointments in the same session forward.
 */
export async function shiftAppointmentsOnCancellation(entityId, entityType, dateStr, canceledSlotTime) {
  try {
    const isMorning = ALL_MORNING_SLOTS.includes(canceledSlotTime);
    const sessionSlots = isMorning ? ALL_MORNING_SLOTS : ALL_AFTERNOON_SLOTS;
    const canceledIdx = sessionSlots.indexOf(canceledSlotTime);

    if (canceledIdx === -1) return;

    if (entityType === "doctor") {
      // Find subsequent active bookings
      const bookings = await Appointment.find({
        doctorId: entityId,
        date: dateStr,
        status: { $in: ["Pending", "Confirmed", "Rescheduled"] },
      });

      // Filter to bookings in the same session starting after the canceled slot
      const subsequentBookings = bookings
        .filter((b) => {
          const idx = sessionSlots.indexOf(b.time);
          return idx > canceledIdx;
        })
        .sort((a, b) => sessionSlots.indexOf(a.time) - sessionSlots.indexOf(b.time));

      // Shift each booking forward one slot
      for (const booking of subsequentBookings) {
        const currentIdx = sessionSlots.indexOf(booking.time);
        const newTime = sessionSlots[currentIdx - 1];

        // Store original slot history
        booking.originalSlotHistory.push({
          date: booking.date,
          time: booking.time,
          reason: "Cancellation Shifting",
          updatedAt: new Date(),
        });

        booking.rescheduledSlotHistory.push({
          date: booking.date,
          time: booking.time,
        });

        const oldTime = booking.time;
        booking.time = newTime;
        booking.bookingStatus = "Auto-Reassigned";
        await booking.save();

        // Notify patient
        const msg = `Notice: Your appointment with Dr. ${booking.doctorName || "Doctor"} on ${dateStr} has been shifted from ${oldTime} to ${newTime} due to slot reordering.`;
        await notifyPatient(booking, "Appointment Shifted", msg);
      }
    } else {
      // For service appointments
      const bookings = await ServiceAppointment.find({
        serviceId: entityId,
        date: dateStr,
        status: { $in: ["Pending", "Confirmed", "Rescheduled"] },
      });

      const subsequentBookings = bookings
        .filter((b) => {
          const tStr = formatSlotString(b.hour, b.minute, b.ampm);
          const idx = sessionSlots.indexOf(tStr);
          return idx > canceledIdx;
        })
        .sort((a, b) => {
          const tA = formatSlotString(a.hour, a.minute, a.ampm);
          const tB = formatSlotString(b.hour, b.minute, b.ampm);
          return sessionSlots.indexOf(tA) - sessionSlots.indexOf(tB);
        });

      for (const booking of subsequentBookings) {
        const oldTime = formatSlotString(booking.hour, booking.minute, booking.ampm);
        const currentIdx = sessionSlots.indexOf(oldTime);
        const newTime = sessionSlots[currentIdx - 1];
        const parsed = parseSlotString(newTime);

        booking.originalSlotHistory.push({
          date: booking.date,
          hour: booking.hour,
          minute: booking.minute,
          ampm: booking.ampm,
          reason: "Cancellation Shifting",
          updatedAt: new Date(),
        });

        booking.rescheduledSlotHistory.push({
          date: booking.date,
          hour: booking.hour,
          minute: booking.minute,
          ampm: booking.ampm,
        });

        booking.hour = parsed.hour;
        booking.minute = parsed.minute;
        booking.ampm = parsed.ampm;
        booking.bookingStatus = "Auto-Reassigned";
        await booking.save();

        const msg = `Notice: Your ${booking.serviceName || "Service"} appointment on ${dateStr} has been shifted from ${oldTime} to ${newTime} due to slot reordering.`;
        await notifyPatient(booking, "Appointment Shifted", msg);
      }
    }
  } catch (err) {
    console.error("shiftAppointmentsOnCancellation error:", err);
  }
}

/**
 * Handle Doctor Emergency / Absence.
 * Reschedules affected appointments to subsequent available dates/slots.
 */
export async function rescheduleForAbsence(entityId, entityType, absenceSettings) {
  const { date, type, untilSlot } = absenceSettings; // type: full-day, morning, afternoon, partial
  try {
    let affectedBookings = [];

    if (entityType === "doctor") {
      const query = {
        doctorId: entityId,
        date: date,
        status: { $in: ["Pending", "Confirmed", "Rescheduled"] },
      };
      const bookings = await Appointment.find(query);

      affectedBookings = bookings.filter((b) => {
        if (type === "full-day") return true;
        if (type === "morning") return ALL_MORNING_SLOTS.includes(b.time);
        if (type === "afternoon") return ALL_AFTERNOON_SLOTS.includes(b.time);
        if (type === "partial") {
          return parseTimeToMinutes(b.time) >= parseTimeToMinutes(untilSlot);
        }
        return false;
      });

      // Sort bookings chronologically by slot time to preserve booking order priority
      affectedBookings.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
    } else {
      const query = {
        serviceId: entityId,
        date: date,
        status: { $in: ["Pending", "Confirmed", "Rescheduled"] },
      };
      const bookings = await ServiceAppointment.find(query);

      affectedBookings = bookings.filter((b) => {
        const timeStr = formatSlotString(b.hour, b.minute, b.ampm);
        if (type === "full-day") return true;
        if (type === "morning") return ALL_MORNING_SLOTS.includes(timeStr);
        if (type === "afternoon") return ALL_AFTERNOON_SLOTS.includes(timeStr);
        if (type === "partial") {
          return parseTimeToMinutes(timeStr) >= parseTimeToMinutes(untilSlot);
        }
        return false;
      });

      affectedBookings.sort((a, b) => {
        const tA = formatSlotString(a.hour, a.minute, a.ampm);
        const tB = formatSlotString(b.hour, b.minute, b.ampm);
        return parseTimeToMinutes(tA) - parseTimeToMinutes(tB);
      });
    }

    if (affectedBookings.length === 0) return { success: true, count: 0 };

    // Find next available slots for rescheduling
    // We will search forward starting from the absence date + 1 day
    let currentDateObj = new Date(date + "T00:00:00");
    const allocatedSlots = {}; // dateStr -> Array of allocated slot strings in this run to prevent collision

    for (const booking of affectedBookings) {
      let rescheduled = false;
      let checkDaysLimit = 30; // Check up to 30 days ahead

      // Start search from date
      let searchDateObj = new Date(currentDateObj);
      if (type === "full-day" || type === "afternoon") {
        searchDateObj.setDate(searchDateObj.getDate() + 1); // Skip to next day
      }

      while (!rescheduled && checkDaysLimit > 0) {
        const searchDateStr = searchDateObj.toISOString().split("T")[0];
        const { availableSlots } = await getAvailableSlots(entityId, entityType, searchDateStr);

        // Filter out slots that we already allocated to other rescheduled patients in this transaction
        const tempAllocated = allocatedSlots[searchDateStr] || [];
        const trulyAvailable = availableSlots.filter((s) => !tempAllocated.includes(s));

        if (trulyAvailable.length > 0) {
          const newSlotTime = trulyAvailable[0];
          
          if (!allocatedSlots[searchDateStr]) allocatedSlots[searchDateStr] = [];
          allocatedSlots[searchDateStr].push(newSlotTime);

          // Update appointment
          if (entityType === "doctor") {
            const oldDate = booking.date;
            const oldTime = booking.time;

            booking.originalSlotHistory.push({
              date: oldDate,
              time: oldTime,
              reason: "Doctor Absence Rescheduling",
              updatedAt: new Date(),
            });

            booking.rescheduledSlotHistory.push({
              date: oldDate,
              time: oldTime,
            });

            booking.date = searchDateStr;
            booking.time = newSlotTime;
            booking.status = "Rescheduled";
            booking.bookingStatus = "Auto-Reassigned";
            await booking.save();

            const msg = `Alert: Due to doctor unavailability, your appointment with Dr. ${booking.doctorName || "Doctor"} has been automatically rescheduled from ${oldDate} ${oldTime} to ${searchDateStr} ${newSlotTime}.`;
            await notifyPatient(booking, "Appointment Rescheduled", msg);
          } else {
            const oldDate = booking.date;
            const oldTime = formatSlotString(booking.hour, booking.minute, booking.ampm);
            const parsed = parseSlotString(newSlotTime);

            booking.originalSlotHistory.push({
              date: oldDate,
              hour: booking.hour,
              minute: booking.minute,
              ampm: booking.ampm,
              reason: "Service Absence Rescheduling",
              updatedAt: new Date(),
            });

            booking.rescheduledSlotHistory.push({
              date: oldDate,
              hour: booking.hour,
              minute: booking.minute,
              ampm: booking.ampm,
            });

            booking.date = searchDateStr;
            booking.hour = parsed.hour;
            booking.minute = parsed.minute;
            booking.ampm = parsed.ampm;
            booking.status = "Rescheduled";
            booking.bookingStatus = "Auto-Reassigned";
            await booking.save();

            const msg = `Alert: Due to service unavailability, your ${booking.serviceName || "Service"} appointment has been automatically rescheduled from ${oldDate} ${oldTime} to ${searchDateStr} ${newSlotTime}.`;
            await notifyPatient(booking, "Appointment Rescheduled", msg);
          }

          rescheduled = true;
        } else {
          // Check next day
          searchDateObj.setDate(searchDateObj.getDate() + 1);
          checkDaysLimit--;
        }
      }
    }

    return { success: true, count: affectedBookings.length };
  } catch (err) {
    console.error("rescheduleForAbsence error:", err);
    throw err;
  }
}
