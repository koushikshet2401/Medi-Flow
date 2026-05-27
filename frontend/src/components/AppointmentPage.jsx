import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { appointmentPageStyles, cardStyles, badgeStyles, iconSize } from '../assets/dummyStyles'
import axios from 'axios';
import { Bell, CalendarDays, CheckCircle, Clock, CreditCard, Wallet, XCircle } from 'lucide-react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Toaster } from 'react-hot-toast';


const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:4000"
  : "https://medi-flow-backend.onrender.com";
const API = axios.create({ baseURL: API_BASE })

// helper functions
function pad(n) {
  return String(n ?? 0).padStart(2, "0");
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const cleanDate = dateStr.split("T")[0].trim();
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const todayStr = `${y}-${m}-${d}`;
  return cleanDate === todayStr;
}

function isAppointmentToday(item) {
  if (!item) return false;
  const activeDate = item.rescheduledTo && item.rescheduledTo.date ? item.rescheduledTo.date : item.date;
  return isToday(activeDate);
}

// this function will giv response as yyyy-mm-dd with slots of time
function parseDateTime(dateStr, timeStr) {
  const fast = new Date(`${dateStr} ${timeStr}`);
  if (!isNaN(fast)) return fast;

  const parts = (dateStr || "").split(" ");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const months = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };
    const month = months[m];
    let [t, ampm] = (timeStr || "").split(" ");
    let [hh, mm] = (t || "0:00").split(":");
    hh = Number(hh || 0);
    mm = Number(mm || 0);

    if (ampm === "PM" && hh !== 12) hh += 12;
    if (ampm === "AM" && hh === 12) hh = 0;

    return new Date(Number(y), month, Number(d), hh, mm);
  }

  const iso = new Date(dateStr);
  if (!isNaN(iso)) return iso;
  return new Date();
}

// this function will help in getting the status
function computeStatus(item) {
  const now = new Date();
  if (!item) return "Pending";

  if (item.refundStatus === "Approved") return "Refunded";
  if (item.status === "Canceled") return "Canceled";
  if (item.status === "Rescheduled") {
    if (
      item.rescheduledTo &&
      item.rescheduledTo.date &&
      item.rescheduledTo.time
    ) {
      const dt = parseDateTime(
        item.rescheduledTo.date,
        item.rescheduledTo.time,
      );
      if (now >= dt) return "Completed";
    }
    return "Rescheduled";
  }
  if (item.status === "Completed") return "Completed";
  if (item.status === "Confirmed") {
    const dtConfirmed = parseDateTime(item.date, item.time);
    if (now >= dtConfirmed) return "Completed";
    return "Confirmed";
  }
  if (item.status === "Pending") {
    const dtPending = parseDateTime(item.date, item.time);
    if (now >= dtPending) return "Completed";
    return "Pending";
  }

  const dt = parseDateTime(item.date, item.time);
  if (now >= dt) return "Completed";
  return item.confirmed ? "Confirmed" : "Pending";
}

const PaymentBadge = ({ payment }) => {
  return payment === "Online" ? (
    <span className={badgeStyles.paymentBadge.online}>
      <CreditCard className={iconSize.small} /> Online
    </span>
  ) : (
    <span className={badgeStyles.paymentBadge.cash}>
      <Wallet className={iconSize.small} /> Cash
    </span>
  );
};

const StatusBadge = ({ itemStatus }) => {
  if (itemStatus === "Completed")
    return (
      <span className={badgeStyles.statusBadge.completed}>
        <CheckCircle className={iconSize.small} /> Completed
      </span>
    );

  if (itemStatus === "Confirmed")
    return (
      <span className={badgeStyles.statusBadge.confirmed}>
        <Bell className={iconSize.small} /> Confirmed
      </span>
    );

  if (itemStatus === "Pending")
    return (
      <span className={badgeStyles.statusBadge.pending}>
        <Clock className={iconSize.small} /> Pending
      </span>
    );

  if (itemStatus === "Canceled")
    return (
      <span className={badgeStyles.statusBadge.canceled}>
        <XCircle className={iconSize.small} /> Canceled
      </span>
    );

  if (itemStatus === "Missed")
    return (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
        <XCircle className={iconSize.small} /> Missed
      </span>
    );

  if (itemStatus === "Refunded")
    return (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
        <CheckCircle className={iconSize.small} /> Refunded
      </span>
    );

  return (
    <span className={badgeStyles.statusBadge.default}>
      <CalendarDays className={iconSize.small} /> Rescheduled
    </span>
  );
};
 
const AppointmentPage = () => {

  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();

  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);

  const [doctorAppts, setDoctorAppts] = useState([]);
  const [serviceAppts, setServiceAppts] = useState([]);

  const [appointmentsRaw, setAppointmentsRaw] = useState({
    doctors: [],
    services: [],
  });
  const [error, setError] = useState(null);

  // Visit confirmation state
  const [processingActionId, setProcessingActionId] = useState(null);

  // simulated toast popup
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleRequestRefund = async (apptId, isService) => {
    setProcessingActionId(apptId);
    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const endpoint = isService
        ? `/api/service-appointments/${apptId}/request-refund`
        : `/api/appointments/${apptId}/request-refund`;
      
      await API.post(endpoint, {}, { headers });
      showToast("Refund requested successfully!");
      loadDoctorAppointments();
      loadServiceAppointments();
    } catch (err) {
      console.error("request refund error:", err);
      showToast(err.response?.data?.message || "Failed to request refund");
    } finally {
      setProcessingActionId(null);
    }
  };

  const handleConfirmVisitDecision = async (apptId, isService, decision) => {
    setProcessingActionId(apptId);
    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const endpoint = isService
        ? `/api/service-appointments/${apptId}/confirm-visit`
        : `/api/appointments/${apptId}/confirm-visit`;
      
      await API.post(endpoint, { decision }, { headers });
      if (decision === "Coming") {
        showToast("Visit confirmed successfully! See you at the hospital.");
      } else {
        showToast("Appointment canceled & refund requested.");
      }
      loadDoctorAppointments();
      loadServiceAppointments();
    } catch (err) {
      console.error("confirm visit error:", err);
      showToast(err.response?.data?.message || "Failed to confirm visit");
    } finally {
      setProcessingActionId(null);
    }
  };

  const loadDoctorAppointments = useCallback(async () => {
    if (!isLoaded) return;
    setLoadingDoctors(true);
    setError(null);

    let token = null;
    try {
      token = await getToken();
      // console.log(
      //   "Clerk token (frontend):",
      //   token ? `${token.slice(0, 20)}...` : null,
      // );
    } catch (err) {
      console.error("Failed to get Clerk token (frontend):", err);
    }

    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    // console.log("Outgoing headers for /api/appointments/me:", headers);

    try {
      const resp = await API.get("/api/appointments/me", { headers });
      // console.log("Response from /api/appointments/me:", resp?.data);

      const fetched =
        resp?.data?.appointments ?? resp?.data?.data ?? resp?.data ?? [];
      const arr = Array.isArray(fetched) ? fetched : [];

      const doctors = arr.filter((a) => {
        return (
          (a.doctorId !== undefined && a.doctorId !== null) ||
          !!a.doctorName ||
          !a.serviceId
        );
      });

      setDoctorAppts(doctors);
      setAppointmentsRaw((p) => ({ ...p, doctors: doctors }));
    } catch (err) {
      console.error(
        "Error calling /api/appointments/me:",
        err?.response?.data || err.message || err,
      );

      if (user?.id) {
        try {
          // console.log("Attempting debug request with ?createdBy=", user.id);
          const debugResp = await API.get(
            `/api/appointments/me?createdBy=${user.id}`,
            { headers },
          );
          // console.log("Debug fallback response:", debugResp?.data);

          const fetched =
            debugResp?.data?.appointments ??
            debugResp?.data?.data ??
            debugResp?.data ??
            [];
          const arr = Array.isArray(fetched) ? fetched : [];
          const doctors = arr.filter(
            (a) =>
              (a.doctorId !== undefined && a.doctorId !== null) ||
              !!a.doctorName ||
              !a.serviceId,
          );
          setDoctorAppts(doctors);
          setAppointmentsRaw((p) => ({ ...p, doctors }));
        } catch (err2) {
          console.error(
            "Debug fallback failed (doctors):",
            err2?.response?.data || err2.message || err2,
          );
          setError((prev) =>
            prev
              ? prev + " | Doctors failed"
              : "Failed to load doctor appointments. Check console.",
          );
          setDoctorAppts([]);
        }
      } else {
        setError((prev) =>
          prev
            ? prev + " | No user id for doctors"
            : "Failed to load doctor appointments and no user id available for debug fallback.",
        );
        setDoctorAppts([]);
      }
    } finally {
      setLoadingDoctors(false);
    }
  }, [isLoaded, getToken, user]);

  //   to load service appointment from the server side 
  const loadServiceAppointments = useCallback(async () => {
    if (!isLoaded) return;
    setLoadingServices(true);
    setError(null);

    let token = null;
    try {
      token = await getToken();
    } catch (err) {
      console.error("Failed to get Clerk token (frontend): err", err);
    }
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    // console.log("Outgoing headers for /api/service-appointments/me:", headers);

    try {
      const resp = await API.get("/api/service-appointments/me", { headers });
      // console.log("Response from /api/service-appointments/me:", resp?.data);

      const fetched =
        resp?.data?.appointments ?? resp?.data?.data ?? resp?.data ?? [];
      const arr = Array.isArray(fetched) ? fetched : [];
      // console.log(arr);

      setServiceAppts(arr);
      setAppointmentsRaw((p) => ({ ...p, services: arr }));
    } catch (err) {
      console.error(
        "Error calling /api/service-appointments/me:",
        err?.response?.data || err.message || err,
      );

      if (user?.id) {
        try {
          // console.log("Attempting debug request with ?createdBy=", user.id);
          const debugResp = await API.get(
            `/api/service-appointments/me?createdBy=${user.id}`,
            { headers },
          );
          // console.log("Debug fallback response (services):", debugResp?.data);

          const fetched =
            debugResp?.data?.appointments ??
            debugResp?.data?.data ??
            debugResp?.data ??
            [];
          const arr = Array.isArray(fetched) ? fetched : [];
          setServiceAppts(arr);
          setAppointmentsRaw((p) => ({ ...p, services: arr }));
        } catch (err2) {
          console.error(
            "Debug fallback failed (services):",
            err2?.response?.data || err2.message || err2,
          );
          setError((prev) =>
            prev
              ? prev + " | Services failed"
              : "Failed to load service appointments. Check console.",
          );
          setServiceAppts([]);
        }
      } else {
        setError((prev) =>
          prev
            ? prev + " | No user id for services"
            : "Failed to load service appointments and no user id available for debug fallback.",
        );
        setServiceAppts([]);
      }
    } finally {
      setLoadingServices(false);
    }
  }, [isLoaded, getToken, user]);

  useEffect(() => {
    loadDoctorAppointments();
    loadServiceAppointments();
  }, [
    isLoaded,
    isSignedIn,
    user,
    loadDoctorAppointments,
    loadServiceAppointments,
  ]);


  //   to reschedule we have to normalize  the field with UI
  function normalizeRescheduled(rt) {
    if (!rt) return null;
    if (rt.date && rt.time) return { date: rt.date, time: rt.time };
    if (
      rt.date &&
      (rt.hour !== undefined || rt.minute !== undefined || rt.ampm)
    ) {
      const hour = rt.hour ?? 0;
      const minute = rt.minute ?? 0;
      const ampm = rt.ampm ?? "";
      return { date: rt.date, time: `${hour}:${pad(minute)} ${ampm}` };
    }
    return {
      date: rt.date || rt?.dateString || "",
      time:
        rt.time ||
        (rt.hour
          ? `${rt.hour}:${pad(rt.minute || 0)} ${rt.ampm || ""}`
          : rt?.timeString || ""),
    };
  }

  //   to get the appointment details
  const appointmentData = useMemo(() => {
    return doctorAppts
      .map((a) => {
        const id = a._id || a.id || String(a._id || "");
        const doctorObj =
          typeof a.doctorId === "object" && a.doctorId ? a.doctorId : {};
        const image =
          doctorObj.imageUrl ||
          doctorObj.image ||
          doctorObj.avatar ||
          a.doctorImage?.url ||
          a.doctorImage ||
          "";
        const doctorName =
          (doctorObj.name && String(doctorObj.name).trim()) ||
          (a.doctorName && String(a.doctorName).trim()) ||
          (a.doctor && String(a.doctor).trim()) ||
          (a.patientName && String(a.patientName).trim()) ||
          "Doctor";

        const patientName = a.patientName || a.patient || "Patient";
        const specialization =
          doctorObj.specialization || a.specialization || a.speciality || "";
        const experience = doctorObj.experience || a.experience || "";
        const date = a.date || "";
        let time = a.time || "";

        if (!time) {
          if (a.hour !== undefined && a.minute !== undefined && a.ampm) {
            time = `${a.hour}:${pad(a.minute)} ${a.ampm}`;
          } else if (a.hour !== undefined && a.ampm) {
            time = `${a.hour}:00 ${a.ampm}`;
          }
        }

        const payment = (a.payment && a.payment.method) || "Cash";
        const status =
          a.status ||
          (a.payment && a.payment.status === "Paid" ? "Confirmed" : "Pending");
        const rescheduledTo = normalizeRescheduled(
          a.rescheduledTo || {
            date: a.rescheduledDate,
            time: a.rescheduledTime,
          },
        );

        const fees = Number(a.fees ?? a.fee ?? a.payment?.amount ?? 0) || 0;

        return {
          id,
          image,
          doctor: doctorName,
          patientName,
          specialization,
          experience,
          date,
          time,
          payment,
          status,
          rescheduledTo,
          fees,
          visitConfirmation: a.visitConfirmation || "Pending",
          refundStatus: a.refundStatus || "None",
          raw: a,
        };
      })
      .map((x) => ({ ...x, status: computeStatus(x) }));
  }, [doctorAppts]);

  const serviceData = useMemo(() => {
    return serviceAppts
      .map((s) => {
        const id = s._id || s.id || String(s._id || "");
        const svc =
          typeof s.serviceId === "object" && s.serviceId ? s.serviceId : {};
        const image =
          svc.imageUrl ||
          svc.image ||
          svc.imageSmall ||
          s.serviceImage?.url ||
          s.serviceImage ||
          "";
        const name = s.serviceName || svc.name || svc.title || "Service";
        const patientName = s.patientName || s.patient || "Patient";
        const price = s.fees ?? s.amount ?? s.price ?? 0;
        const date = s.date || "";
        let time = s.time || "";
        if (!time) {
          if (s.hour !== undefined && s.minute !== undefined && s.ampm) {
            time = `${s.hour}:${pad(s.minute)} ${s.ampm}`;
          } else if (s.hour !== undefined && s.ampm) {
            time = `${s.hour}:00 ${s.ampm}`;
          }
        }

        const payment = (s.payment && s.payment.method) || "Cash";
        const status =
          s.status ||
          (s.payment && s.payment.status === "Paid" ? "Confirmed" : "Pending");

        const rescheduledTo = normalizeRescheduled(s.rescheduledTo || null);

        return {
          id,
          image,
          name,
          patientName,
          price,
          date,
          time,
          payment,
          status,
          rescheduledTo,
          visitConfirmation: s.visitConfirmation || "Pending",
          refundStatus: s.refundStatus || "None",
          raw: s,
        };
      })
      .map((x) => ({ ...x, status: computeStatus(x) }));
  }, [serviceAppts]);



  // Notification highlight and auto-scroll
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const highlightId = params.get("highlight");
    if (highlightId) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`appt-card-${highlightId}`) || document.getElementById(`srv-card-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.className += " ring-4 ring-sky-500 ring-offset-2 animate-pulse";
          setTimeout(() => {
            element.className = element.className.replace(" ring-4 ring-sky-500 ring-offset-2 animate-pulse", "");
          }, 4000);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [appointmentData, serviceData]);

  return (
    <div className={appointmentPageStyles.pageContainer}>
      <Toaster position='top-right' />
      <div className={appointmentPageStyles.maxWidthContainer}>
        <h1 className={appointmentPageStyles.doctorTitle}>
          Your Doctor Appointments
        </h1>
        {loadingDoctors && (
          <div className={appointmentPageStyles.loadingText}>
            Loading Doctor...
          </div>
        )}
        {!loadingDoctors && appointmentData.length === 0 && (
          <div className={appointmentPageStyles.emptyStateText}>
            No Doctor Appointments found
          </div>
        )}

        <div className={appointmentPageStyles.doctorGrid}>
          {appointmentData.map((item) => (
            <div key={item.id} id={`appt-card-${item.id}`} className={cardStyles.doctorCard}>
              <div className={cardStyles.doctorImageContainer}>
                <img
                  src={item.image || "/placeholder-doctor.png"}
                  alt={item.doctor}
                  className={cardStyles.image}
                  loading='lazy'
                />
              </div>

              <h2 className={cardStyles.doctorName}>
                {item.doctor}
              </h2>
              <div className={cardStyles.specialization}>
                {item.specialization} {" "}
                {item.experience ? `• ${item.experience}` : ""}
              </div>

              <p className={cardStyles.dateContainer}>
                <CalendarDays className={iconSize.medium} /> {item.date}
              </p>
              <p className={cardStyles.timeContainer}>
                <Clock className={iconSize.medium} /> {item.time}
              </p>

              <div className={cardStyles.badgesContainer}>
                <PaymentBadge payment={item.payment} />
                <StatusBadge itemStatus={item.status} />
              </div>

              {item.status === "Rescheduled" && item.rescheduledTo ? (
                <div className={cardStyles.rescheduledText}>
                  Reschedule to {" "}
                  <span className={cardStyles.rescheduledSpan}>
                    {item.rescheduledTo.date} : {item.rescheduledTo.time}
                  </span>
                </div>
              ) : null}

              {/* visit confirmation and refund details inside doctor card */}
              {item.status === "Missed" && item.refundStatus === "None" && (
                <div className="mt-3 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800">
                  <p className="font-semibold mb-2">You missed the appointment. You can request a refund.</p>
                  <button
                    disabled={processingActionId === item.id}
                    onClick={() => handleRequestRefund(item.id, false)}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-1.5 px-3 rounded-lg w-full transition text-[10px]"
                  >
                    {processingActionId === item.id ? "Processing..." : "Request Refund"}
                  </button>
                </div>
              )}

              {item.status !== "Canceled" && item.status !== "Completed" && item.status !== "Missed" && item.refundStatus === "None" && (
                <div className="mt-3">
                  <button
                    disabled={processingActionId === item.id}
                    onClick={() => {
                      if (window.confirm("Are you sure you want to cancel this appointment and request a refund?")) {
                        handleRequestRefund(item.id, false);
                      }
                    }}
                    className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 font-bold py-1.5 px-3 rounded-lg border border-rose-200 hover:border-rose-300 transition text-[10px] cursor-pointer"
                  >
                    {processingActionId === item.id ? "Processing..." : "Cancel & Request Refund"}
                  </button>
                </div>
              )}

              {item.refundStatus === "Pending" && (
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-center text-xs font-semibold text-amber-800">
                  Refund: Processing (Pending Admin Approval)
                </div>
              )}

              {item.refundStatus === "Approved" && (
                <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center text-xs font-semibold text-emerald-800">
                  Refund: Approved & Processed (₹{item.fees || 0})
                </div>
              )}

              {item.status !== "Canceled" && item.status !== "Completed" && item.status !== "Missed" && item.visitConfirmation === "Pending" && isAppointmentToday(item) && (
                <div className="mt-3 bg-sky-50 border border-sky-100 rounded-xl p-3 text-xs text-sky-950 flex flex-col gap-2">
                  <p className="font-semibold text-center text-sky-900">Are you coming today?</p>
                  <div className="flex gap-2">
                    <button
                      disabled={processingActionId === item.id}
                      onClick={() => handleConfirmVisitDecision(item.id, false, "Coming")}
                      className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-1 px-2 rounded-lg flex-1 transition text-[10px]"
                    >
                      Yes, Coming
                    </button>
                    <button
                      disabled={processingActionId === item.id}
                      onClick={() => handleConfirmVisitDecision(item.id, false, "Not Coming")}
                      className="bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold py-1 px-2 rounded-lg flex-1 transition text-[10px]"
                    >
                      No, Refund
                    </button>
                  </div>
                </div>
              )}

              {item.status !== "Canceled" && item.status !== "Completed" && item.status !== "Missed" && item.visitConfirmation === "Coming" && (
                <div className="mt-2 bg-emerald-50 border border-emerald-100 rounded-xl p-2 text-center text-xs font-bold text-emerald-800">
                  ✓ Visit Confirmed (Coming)
                </div>
              )}
            </div>
          ))}
        </div>
        <h2 className={appointmentPageStyles.serviceTitle}>
          Your Booked Services
        </h2>
        {loadingServices && (
          <div className={appointmentPageStyles.serviceLoadingText}>
            Loading Service Bookings...
          </div>
        )}
        {!loadingServices && serviceData.length === 0 && (
          <div className={appointmentPageStyles.serviceEmptyStateText}>
            No Service bookings found
          </div>
        )}
        <div className={appointmentPageStyles.serviceGrid}>
          {serviceData.map((srv) => (
            <div key={srv.id} id={`srv-card-${srv.id}`} className={cardStyles.serviceCard}>
              <div className={cardStyles.serviceImageContainer}>
                <img
                  src={srv.image || "/placeholder-service.png"}
                  alt={srv.name}
                  className={cardStyles.image}
                  loading="lazy"
                />
              </div>

              <h3 className={cardStyles.serviceName}>{srv.name}</h3>

              <p className={cardStyles.price}>₹{srv.price}</p>

              <p className={cardStyles.serviceDateContainer}>
                <CalendarDays className={iconSize.medium} /> {srv.date}
              </p>

              <p className={cardStyles.serviceTimeContainer}>
                <Clock className={iconSize.medium} /> {srv.time}
              </p>

              <div className={cardStyles.badgesContainer}>
                <PaymentBadge payment={srv.payment} />
                <StatusBadge itemStatus={srv.status} />
              </div>

              {srv.status === "Rescheduled" && srv.rescheduledTo ? (
                <div className={cardStyles.serviceRescheduledText}>
                  Rescheduled to{" "}
                  <span className={cardStyles.rescheduledSpan}>
                    {srv.rescheduledTo.date} : {srv.rescheduledTo.time}
                  </span>
                </div>
              ) : null}

              {/* visit confirmation and refund details inside service card */}
              {srv.status === "Missed" && srv.refundStatus === "None" && (
                <div className="mt-3 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800">
                  <p className="font-semibold mb-2">You missed the appointment. You can request a refund.</p>
                  <button
                    disabled={processingActionId === srv.id}
                    onClick={() => handleRequestRefund(srv.id, true)}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-1.5 px-3 rounded-lg w-full transition text-[10px]"
                  >
                    {processingActionId === srv.id ? "Processing..." : "Request Refund"}
                  </button>
                </div>
              )}

              {srv.status !== "Canceled" && srv.status !== "Completed" && srv.status !== "Missed" && srv.refundStatus === "None" && (
                <div className="mt-3">
                  <button
                    disabled={processingActionId === srv.id}
                    onClick={() => {
                      if (window.confirm("Are you sure you want to cancel this service booking and request a refund?")) {
                        handleRequestRefund(srv.id, true);
                      }
                    }}
                    className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 font-bold py-1.5 px-3 rounded-lg border border-rose-200 hover:border-rose-300 transition text-[10px] cursor-pointer"
                  >
                    {processingActionId === srv.id ? "Processing..." : "Cancel & Request Refund"}
                  </button>
                </div>
              )}

              {srv.refundStatus === "Pending" && (
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-center text-xs font-semibold text-amber-800">
                  Refund: Processing (Pending Admin Approval)
                </div>
              )}

              {srv.refundStatus === "Approved" && (
                <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center text-xs font-semibold text-emerald-800">
                  Refund: Approved & Processed (₹{srv.price || 0})
                </div>
              )}

              {srv.status !== "Canceled" && srv.status !== "Completed" && srv.status !== "Missed" && srv.visitConfirmation === "Pending" && isAppointmentToday(srv) && (
                <div className="mt-3 bg-sky-50 border border-sky-100 rounded-xl p-3 text-xs text-sky-950 flex flex-col gap-2">
                  <p className="font-semibold text-center text-sky-900">Are you coming today?</p>
                  <div className="flex gap-2">
                    <button
                      disabled={processingActionId === srv.id}
                      onClick={() => handleConfirmVisitDecision(srv.id, true, "Coming")}
                      className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-1 px-2 rounded-lg flex-1 transition text-[10px]"
                    >
                      Yes, Coming
                    </button>
                    <button
                      disabled={processingActionId === srv.id}
                      onClick={() => handleConfirmVisitDecision(srv.id, true, "Not Coming")}
                      className="bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold py-1 px-2 rounded-lg flex-1 transition text-[10px]"
                    >
                      No, Refund
                    </button>
                  </div>
                </div>
              )}

              {srv.status !== "Canceled" && srv.status !== "Completed" && srv.status !== "Missed" && srv.visitConfirmation === "Coming" && (
                <div className="mt-2 bg-emerald-50 border border-emerald-100 rounded-xl p-2 text-center text-xs font-bold text-emerald-800">
                  ✓ Visit Confirmed (Coming)
                </div>
              )}
            </div>
          ))}
        </div>
      </div>


      {/* 🔔 SIMULATED PREMIUM IN-APP TOAST */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900/95 text-white border border-slate-700 rounded-2xl px-5 py-4 shadow-2xl flex items-center gap-3 animate-scaleUp backdrop-blur-md">
          <div className="w-2.5 h-2.5 bg-sky-500 rounded-full animate-ping"></div>
          <span className="text-sm font-bold tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* Keyframe styles */}
      <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes shake {
          0%, 100% { transform: rotate(0); }
          20%, 60% { transform: rotate(-2deg); }
          40%, 80% { transform: rotate(2deg); }
        }
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
        .animate-shake {
          animation: shake 0.6s ease-in-out infinite;
          animation-delay: 2s;
        }
        .animate-scaleUp {
          animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  )
}

export default AppointmentPage;