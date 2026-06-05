import React, { useMemo, useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  CalendarCheck,
  MapPin,
  BadgeInfo,
  GraduationCap,
  Award,
  Clock,
  Star,
  Heart,
  Zap,
  Shield,
  Users,
  Phone,
  Sun,
  Sunset,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Clerk client hooks
import { useAuth, useUser } from "@clerk/clerk-react";
import { doctorDetailStyles } from "../assets/dummyStyles";

const API_BASE =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:4000"
    : "https://medi-flow-backend.onrender.com";

/**
 * Normalize phone string: remove non-digits and return up to last 10 digits.
 */
function normalizePhoneTo10(phone) {
  if (!phone) return "";
  const digits = ("" + phone).replace(/\D/g, "");
  if (!digits) return "";
  return digits.length <= 10 ? digits : digits.slice(-10);
}

// ── Slot groups (same as backend)
const MORNING_SLOTS = ["09:30 AM", "10:30 AM", "11:30 AM", "12:30 PM"];
const AFTERNOON_SLOTS = ["02:30 PM", "03:30 PM", "04:30 PM"];

const SLOT_RANGES = {
  "09:30 AM": "09:30 AM - 10:30 AM",
  "10:30 AM": "10:30 AM - 11:30 AM",
  "11:30 AM": "11:30 AM - 12:30 PM",
  "12:30 PM": "12:30 PM - 01:30 PM",
  "02:30 PM": "02:30 PM - 03:30 PM",
  "03:30 PM": "03:30 PM - 04:30 PM",
  "04:30 PM": "04:30 PM - 05:30 PM",
};

const formatAssignedDate = (dateStr) => {
  if (!dateStr) return "";
  const dt = new Date(dateStr + "T00:00:00");
  if (isNaN(dt)) return dateStr;
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return `${weekdays[dt.getDay()]}, ${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
};

function groupSlots(allSlots) {
  const morning = allSlots.filter((s) => MORNING_SLOTS.includes(s));
  const afternoon = allSlots.filter((s) => AFTERNOON_SLOTS.includes(s));
  // anything else goes to afternoon bucket
  const other = allSlots.filter(
    (s) => !MORNING_SLOTS.includes(s) && !AFTERNOON_SLOTS.includes(s)
  );
  return { morning, afternoon: [...afternoon, ...other] };
}

export default function DoctorDetail() {
  const { id } = useParams();

  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    age: "",
    mobile: "",
    gender: "",
    email: "",
  });

  const [paymentMethod, setPaymentMethod] = useState("Online");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clerk hooks
  const { getToken, isLoaded: authLoaded } = useAuth();
  const { isSignedIn, user, isLoaded: userLoaded } = useUser();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Prefill the form fields quietly if user is available
  useEffect(() => {
    if (!userLoaded) return;
    if (user) {
      const fullName =
        user.fullName ||
        `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
        "";
      const rawPhone =
        user.primaryPhone ||
        (user.phoneNumbers && user.phoneNumbers.length > 0
          ? user.phoneNumbers[0]
          : "") ||
        "";
      const phone = normalizePhoneTo10(rawPhone);
      const email =
        (user.emailAddresses && user.emailAddresses[0]?.emailAddress) ||
        user.primaryEmailAddress ||
        "";

      setFormData((prev) => ({
        ...prev,
        name: prev.name || fullName,
        mobile: prev.mobile || phone,
        email: prev.email || email,
      }));
    }
  }, [userLoaded, user]);

  const [slotsData, setSlotsData] = useState({ dates: [], slots: {}, blockedDates: [] });

  useEffect(() => {
    let mounted = true;
    async function fetchDoctor() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/doctors/${id}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body.message || `Failed to fetch (status ${res.status})`,
          );
        }
        const payload = await res.json();
        const doc = payload?.data || null;
        if (mounted) setDoctor(doc);

        // Fetch dynamically generated availability slots
        const slotsRes = await fetch(`${API_BASE}/api/doctors/${id}/available-slots`);
        if (slotsRes.ok) {
          const slotsPayload = await slotsRes.json();
          if (mounted && slotsPayload.success) {
            setSlotsData({
              dates: slotsPayload.dates || [],
              slots: slotsPayload.slots || {},
              blockedDates: slotsPayload.blockedDates || [],
            });
            let foundDate = "";
            let foundTime = "";
            for (const d of slotsPayload.dates || []) {
              const info = slotsPayload.slots[d];
              if (info && info.availableSlots && info.availableSlots.length > 0) {
                foundDate = d;
                foundTime = info.availableSlots[0];
                break;
              }
            }
            setSelectedDate(foundDate);
            setSelectedSlot(foundTime);
          }
        }
      } catch (err) {
        if (mounted) setError(err.message || "Failed to fetch doctor");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchDoctor();
    return () => {
      mounted = false;
    };
  }, [id]);

  const fee = Number(doctor?.fee ?? doctor?.fees ?? 0);

  // Mobile input handlers: only digits, max 10
  const handleMobileChange = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    setFormData((prev) => ({ ...prev, mobile: digits }));
  };

  const handleMobilePaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData("text");
    const digits = pasted.replace(/\D/g, "").slice(0, 10);
    setFormData((prev) => ({ ...prev, mobile: digits }));
  };

  const handleBooking = async () => {
    if (isSubmitting) return;

    // Validate patient details
    if (
      !formData.name ||
      !formData.age ||
      !formData.mobile ||
      !formData.gender
    ) {
      toast.error("Please fill all patient details!", {
        position: "top-center",
        autoClose: 2000,
      });
      return;
    }

    // Mobile must be exactly 10 digits
    const mobileDigits = (formData.mobile || "").replace(/\D/g, "");
    if (mobileDigits.length !== 10) {
      toast.error("Mobile number must be exactly 10 digits.", {
        position: "top-center",
        autoClose: 2500,
      });
      return;
    }

    if (!selectedDate || !selectedSlot) {
      toast.error("Please select a date and time slot", {
        position: "top-center",
        autoClose: 2000,
      });
      return;
    }

    if (!authLoaded || !userLoaded) {
      toast.error("Authentication not ready. Please try again in a moment.", {
        position: "top-center",
        autoClose: 2000,
      });
      return;
    }

    if (!isSignedIn) {
      toast.error("You must sign in to create an appointment.", {
        position: "top-center",
        autoClose: 2200,
      });
      return;
    }

    setIsSubmitting(true);

    const dateISO = selectedDate;
    const doctorNameValue = doctor?.name || "";
    const specialityValue =
      doctor?.specialization ||
      doctor?.speciality ||
      doctor?.specialityName ||
      "";
    const ownerValue = doctor?.owner || undefined;

    const payload = {
      doctorId: doctor._id || doctor.id,
      doctorName: doctorNameValue,
      speciality: specialityValue,
      owner: ownerValue,
      doctorImageUrl: doctor?.imageUrl || doctor?.image || "",
      doctorImagePublicId:
        doctor?.imagePublicId || doctor?.image?.publicId || "",
      patientName: formData.name,
      mobile: mobileDigits,
      age: formData.age,
      gender: formData.gender,
      date: dateISO,
      time: selectedSlot,
      fee: fee,
      fees: fee,
      paymentMethod: paymentMethod || "Online",
      email: formData.email || undefined,
    };

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to obtain authentication token.");
      }

      const res = await fetch(`${API_BASE}/api/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          body?.message || body?.error || `Booking failed (${res.status})`;
        toast.error(message, { position: "top-center" });
        setIsSubmitting(false);
        return;
      }

      if (body?.checkoutUrl) {
        window.location.href = body.checkoutUrl;
        return;
      }

      toast.success("Booking successful", {
        position: "top-center",
        autoClose: 1500,
      });

      setTimeout(() => {
        window.location.href = "/appointments?payment_status=Pending";
      }, 700);
    } catch (err) {
      console.error("Booking error:", err);
      toast.error(
        err?.message || "Network error - booking failed (auth or server issue)",
        { position: "top-center" },
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── helpers
  const isToday = (date) => {
    const t = new Date();
    return (
      date.getDate() === t.getDate() &&
      date.getMonth() === t.getMonth() &&
      date.getFullYear() === t.getFullYear()
    );
  };

  if (loading)
    return (
      <div className={doctorDetailStyles.loadingContainer}>
        <div>Loading doctor...</div>
      </div>
    );

  if (error)
    return (
      <div className={doctorDetailStyles.errorContainer}>
        <div className={doctorDetailStyles.errorContent}>
          <div className={doctorDetailStyles.errorText}>Error</div>
          <div className={doctorDetailStyles.errorMessage}>{error}</div>
          <Link to="/doctors" className={doctorDetailStyles.backButton}>
            <ArrowLeft size={20} />
            Back to Doctors
          </Link>
        </div>
      </div>
    );

  if (!doctor)
    return (
      <div className={doctorDetailStyles.notFoundContainer}>
        <div className={doctorDetailStyles.notFoundContent}>
          <div className={doctorDetailStyles.notFoundEmoji}>😷</div>
          <h1 className={doctorDetailStyles.notFoundTitle}>Doctor Not Found</h1>
          <Link to="/doctors" className={doctorDetailStyles.backButton}>
            <ArrowLeft size={20} />
            Back to Doctors
          </Link>
        </div>
      </div>
    );

  return (
    <div className={doctorDetailStyles.pageContainer}>
      <ToastContainer />
      {/* Header */}
      <div className={doctorDetailStyles.headerContainer}>
        <div className={doctorDetailStyles.headerContent}>
          <div className={doctorDetailStyles.headerFlex}>
            <Link to="/doctors" className={doctorDetailStyles.headerBackButton}>
              <ArrowLeft size={18} />
              <span className={doctorDetailStyles.headerBackButtonText}>
                Back
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <h1 className={doctorDetailStyles.headerTitle}>Doctor Profile</h1>
            </div>

            <div className={doctorDetailStyles.headerRatingContainer}>
              <Star className={doctorDetailStyles.headerRatingIcon} size={18} />
              <span className={doctorDetailStyles.headerRatingText}>
                {doctor.rating}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`${doctorDetailStyles.mainContent} ${
          isVisible
            ? doctorDetailStyles.visibleState
            : doctorDetailStyles.hiddenState
        }`}
      >
        {/* profile card */}
        <div className={doctorDetailStyles.profileCard}>
          <div className={doctorDetailStyles.profileGrid}>
            <div className={doctorDetailStyles.leftColumn}>
              <div className={doctorDetailStyles.avatarContainer}>
                <div className={doctorDetailStyles.avatarGlow}></div>

                <img
                  src={
                    doctor.imageUrl || doctor.image || "/placeholder-doctor.jpg"
                  }
                  alt={doctor.name}
                  className={doctorDetailStyles.avatarImage}
                  style={{ objectPosition: "center" }}
                />
              </div>

              <div className={doctorDetailStyles.statsGrid}>
                <div className={doctorDetailStyles.statBox}>
                  <Heart
                    className={`${doctorDetailStyles.statIcon} ${doctorDetailStyles.heartIcon}`}
                  />
                  <div className={doctorDetailStyles.statValue}>
                    {doctor.success}%
                  </div>
                  <div className={doctorDetailStyles.statLabel}>Success</div>
                </div>
                <div className={doctorDetailStyles.statBox}>
                  <Award
                    className={`${doctorDetailStyles.statIcon} ${doctorDetailStyles.awardIcon}`}
                  />
                  <div className={doctorDetailStyles.statValue}>
                    {doctor.experience} Years
                  </div>
                  <div className={doctorDetailStyles.statLabel}>Experience</div>
                </div>
                <div className={doctorDetailStyles.statBox}>
                  <Users
                    className={`${doctorDetailStyles.statIcon} ${doctorDetailStyles.usersIcon}`}
                  />
                  <div className={doctorDetailStyles.statValue}>
                    {doctor.patients}
                  </div>
                  <div className={doctorDetailStyles.statLabel}>Patients</div>
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className={doctorDetailStyles.rightColumn}>
              <div className="space-y-3">
                <h1 className={doctorDetailStyles.doctorName}>{doctor.name}</h1>
                <div className={doctorDetailStyles.specializationBadge}>
                  <Zap className={doctorDetailStyles.badgeIcon} />
                  {doctor.specialization ||
                    doctor.speciality ||
                    doctor.specialization}
                </div>
              </div>

              <div className={doctorDetailStyles.infoGrid}>
                <div className={doctorDetailStyles.infoItem}>
                  <GraduationCap className={doctorDetailStyles.infoIcon} />
                  <div>
                    <div className={doctorDetailStyles.infoLabel}>
                      Qualifications
                    </div>
                    <div className={doctorDetailStyles.infoValue}>
                      {doctor.qualifications}
                    </div>
                  </div>
                </div>

                <div className={doctorDetailStyles.infoItem}>
                  <MapPin className={doctorDetailStyles.infoIcon} />
                  <div>
                    <div className={doctorDetailStyles.infoLabel}>Location</div>
                    <div className={doctorDetailStyles.infoValue}>
                      {doctor.location}
                    </div>
                  </div>
                </div>

                <div className={doctorDetailStyles.infoItem}>
                  <Clock className={doctorDetailStyles.infoIcon} />
                  <div>
                    <div className={doctorDetailStyles.infoLabel}>
                      Consultation Fee
                    </div>
                    <div className={doctorDetailStyles.feeValue}>₹{fee}</div>
                  </div>
                </div>

                <div className={doctorDetailStyles.infoItem}>
                  <Shield className={doctorDetailStyles.infoIcon} />
                  <div>
                    <div className={doctorDetailStyles.infoLabel}>
                      Availability
                    </div>
                    <div className={doctorDetailStyles.infoValue}>
                      {doctor.availability === "Available" || doctor.available
                        ? "Available"
                        : "Available Soon"}
                    </div>
                  </div>
                </div>
              </div>

              <div className={doctorDetailStyles.aboutContainer}>
                <div className={doctorDetailStyles.aboutHeader}>
                  <BadgeInfo className={doctorDetailStyles.aboutIcon} />
                  <h3 className={doctorDetailStyles.aboutTitle}>
                    About Doctor
                  </h3>
                </div>
                <p className={doctorDetailStyles.aboutText}>
                  {doctor.about || doctor.bio}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* APPOINTMENT */}
        <div className={doctorDetailStyles.appointmentContainer}>
          <div className={doctorDetailStyles.appointmentContent}>
            <div className={doctorDetailStyles.appointmentHeader}>
              <CalendarCheck className={doctorDetailStyles.appointmentIcon} />
              <h2 className={doctorDetailStyles.appointmentTitle}>
                Book Your Appointment
              </h2>
            </div>

            <div className={doctorDetailStyles.appointmentGrid}>
              {/* LEFT COLUMN */}
              <div className={doctorDetailStyles.dateSection}>



                {/* PATIENT FORM */}
                <div className={doctorDetailStyles.patientForm}>
                  <h3 className={doctorDetailStyles.patientFormTitle}>
                    Patient Details
                  </h3>

                  <div className={doctorDetailStyles.patientFormGrid}>
                    <input
                      type="text"
                      placeholder="Full Name"
                      className={doctorDetailStyles.formInput}
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />

                    <input
                      type="number"
                      placeholder="Age"
                      className={doctorDetailStyles.formInput}
                      value={formData.age}
                      onChange={(e) =>
                        setFormData({ ...formData, age: e.target.value })
                      }
                    />

                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="\d{10}"
                      maxLength={10}
                      placeholder="Mobile Number (10 digits)"
                      className={doctorDetailStyles.formInput}
                      value={formData.mobile}
                      onChange={(e) => handleMobileChange(e.target.value)}
                      onPaste={handleMobilePaste}
                    />

                    <select
                      className={doctorDetailStyles.formSelect}
                      value={formData.gender}
                      onChange={(e) =>
                        setFormData({ ...formData, gender: e.target.value })
                      }
                    >
                      <option value="">Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>

                    <input
                      type="email"
                      placeholder="Email (optional - for receipts)"
                      className={doctorDetailStyles.emailInput}
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                </div>
                {/* ASSIGNED SLOT */}
                {selectedDate && selectedSlot ? (
                  <div className="bg-[#E6F1FB] border border-[#85B7EB] rounded-2xl p-6 shadow-sm flex flex-col gap-4 mt-6">
                    <h3 className="text-lg font-bold text-[#042C53] flex items-center gap-2">
                      <Clock className="w-5 h-5 text-[#185FA5]" />
                      Assigned Booking Slot
                    </h3>
                    <p className="text-sm text-[#0C447C] leading-relaxed">
                      To maintain a fair, queue-based booking system, we automatically allocate the next available slot.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                      <div className="bg-white rounded-xl p-4 border border-[#B5D4F4]">
                        <div className="text-xs text-[#185FA5] font-semibold uppercase tracking-wider">Date</div>
                        <div className="text-base font-bold text-[#042C53] mt-1">
                          {formatAssignedDate(selectedDate)}
                        </div>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-[#B5D4F4]">
                        <div className="text-xs text-[#185FA5] font-semibold uppercase tracking-wider">Time Interval</div>
                        <div className="text-base font-bold text-[#042C53] mt-1">
                          {SLOT_RANGES[selectedSlot] || selectedSlot}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 shadow-sm text-center mt-6">
                    <h3 className="text-lg font-bold text-rose-800">No Slots Available</h3>
                    <p className="text-sm text-rose-600 mt-2">
                      There are no available slots in the upcoming 14 days. Please contact the administrator or check back later.
                    </p>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN */}
              <div className={doctorDetailStyles.timeSlotsSection}>

                {/* SUMMARY */}
                <div className={doctorDetailStyles.summaryContainer}>
                  <div className={doctorDetailStyles.summaryItem}>
                    <div className={doctorDetailStyles.summaryRow}>
                      <span className={doctorDetailStyles.summaryLabel}>
                        Selected Doctor:
                      </span>
                      <span className={doctorDetailStyles.summaryValue}>
                        {doctor?.name || "—"}
                      </span>
                    </div>

                    <div className={doctorDetailStyles.summaryRow}>
                      <span className={doctorDetailStyles.summaryLabel}>
                        Doctor Speciality:
                      </span>
                      <span className={doctorDetailStyles.summaryValue}>
                        {doctor?.specialization || doctor?.speciality || "—"}
                      </span>
                    </div>

                    <div className={doctorDetailStyles.summaryRow}>
                      <span className={doctorDetailStyles.summaryLabel}>
                        Selected Date:
                      </span>
                      <span className={doctorDetailStyles.summaryValue}>
                        {selectedDate
                          ? formatAssignedDate(selectedDate)
                          : "Not selected"}
                      </span>
                    </div>

                    <div className={doctorDetailStyles.summaryRow}>
                      <span className={doctorDetailStyles.summaryLabel}>
                        Selected Time:
                      </span>
                      <span className={doctorDetailStyles.summaryValue}>
                        {selectedSlot || "Not selected"}
                      </span>
                    </div>

                    <div className={doctorDetailStyles.summaryRow}>
                      <span className={doctorDetailStyles.summaryLabel}>
                        Consultation Fee:
                      </span>
                      <span className={doctorDetailStyles.feeDisplay}>
                        ₹{fee}
                      </span>
                    </div>

                    <div className={doctorDetailStyles.summaryRow}>
                      <span className={doctorDetailStyles.summaryLabel}>
                        Payment:
                      </span>
                      <span className={doctorDetailStyles.summaryValue}>
                        Online
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleBooking}
                    disabled={!selectedDate || !selectedSlot || isSubmitting}
                    className={`${doctorDetailStyles.bookingButton} ${
                      !selectedDate || !selectedSlot || isSubmitting
                        ? doctorDetailStyles.bookingButtonDisabled
                        : doctorDetailStyles.bookingButtonEnabled
                    }`}
                  >
                    <div className={doctorDetailStyles.bookingButtonContent}>
                      <Phone className={doctorDetailStyles.bookingIcon} />
                      <span>
                        {isSubmitting ? "Booking..." : "Confirm Booking"}
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>{" "}
      </div>

      {/* scrollbar-hide utility */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}