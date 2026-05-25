import React, { useEffect, useRef, useState } from "react";
import { navbarStyles } from "../assets/dummyStyles";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  SignOutButton,
  useClerk,
  UserButton,
  useAuth,
} from "@clerk/clerk-react";
import {
  User,
  Menu,
  X,
  LogIn,
  Home,
  Stethoscope,
  Briefcase,
  CalendarCheck,
  MessageSquare,
  Bell,
} from "lucide-react";
import logo from "../assets/logo.png";

const STORAGE_KEY = "doctorToken_v1";
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:4000"
  : "https://medi-flow-backend.onrender.com";

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Doctor login state from localStorage
  const [isDoctorLoggedIn, setIsDoctorLoggedIn] = useState(() => {
    try {
      return Boolean(localStorage.getItem(STORAGE_KEY));
    } catch {
      return false;
    }
  });

  const location = useLocation();
  const navigate = useNavigate();
  const clerk = useClerk();
  const navRef = useRef(null);

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const bellRef = useRef(null);
  const { getToken } = useAuth();

  const loadNotifications = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };

      const [resDoc, resSvc] = await Promise.all([
        fetch(`${API_BASE}/api/appointments/me`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE}/api/service-appointments/me`, { headers }).then(r => r.ok ? r.json() : null),
      ]);

      const docList = resDoc?.appointments ?? resDoc?.data ?? [];
      const svcList = resSvc?.appointments ?? resSvc?.data ?? [];

      const list = [];

      docList.forEach(a => {
        const doctorName = a.doctorName || (a.doctorId && a.doctorId.name) || "Doctor";
        if (a.status === "Missed" && a.refundStatus === "None") {
          list.push({
            id: `missed-${a._id || a.id}`,
            title: "Missed Appointment ⚠️",
            message: `You missed your appointment with ${doctorName} on ${a.date}. Click to request a refund.`,
            type: "missed",
            targetId: a._id || a.id,
            date: a.date,
          });
        }
        if (a.refundStatus === "Pending") {
          list.push({
            id: `pending-${a._id || a.id}`,
            title: "Refund Processing ⏳",
            message: `Your refund request for ${doctorName} is pending admin approval.`,
            type: "pending",
            targetId: a._id || a.id,
            date: a.date,
          });
        }
        if (a.refundStatus === "Approved") {
          list.push({
            id: `approved-${a._id || a.id}`,
            title: "Refund Approved ✅",
            message: `Refund of ₹${a.fees || 0} for ${doctorName} is approved and processed!`,
            type: "approved",
            targetId: a._id || a.id,
            date: a.date,
          });
        }
        if (a.status === "Rescheduled") {
          list.push({
            id: `rescheduled-${a._id || a.id}`,
            title: "Rescheduled Alert 📅",
            message: `Your appointment with ${doctorName} has been rescheduled to ${a.date} at ${String(a.hour).padStart(2, "0")}:${String(a.minute).padStart(2, "0")} ${a.ampm}.`,
            type: "rescheduled",
            targetId: a._id || a.id,
            date: a.date,
          });
        }
      });

      svcList.forEach(s => {
        const name = s.serviceName || (s.serviceId && s.serviceId.name) || "Service";
        if (s.status === "Missed" && s.refundStatus === "None") {
          list.push({
            id: `missed-${s._id || s.id}`,
            title: "Missed Service Booking ⚠️",
            message: `You missed your ${name} booking on ${s.date}. Click to request a refund.`,
            type: "missed",
            targetId: s._id || s.id,
            date: s.date,
          });
        }
        if (s.refundStatus === "Pending") {
          list.push({
            id: `pending-${s._id || s.id}`,
            title: "Refund Processing ⏳",
            message: `Your refund request for ${name} is pending admin approval.`,
            type: "pending",
            targetId: s._id || s.id,
            date: s.date,
          });
        }
        if (s.refundStatus === "Approved") {
          list.push({
            id: `approved-${s._id || s.id}`,
            title: "Refund Approved ✅",
            message: `Refund of ₹${s.fees || 0} for ${name} is approved and processed!`,
            type: "approved",
            targetId: s._id || s.id,
            date: s.date,
          });
        }
        if (s.status === "Rescheduled") {
          list.push({
            id: `rescheduled-${s._id || s.id}`,
            title: "Rescheduled Alert 📅",
            message: `Your booking for ${name} has been rescheduled to ${s.date} at ${String(s.hour).padStart(2, "0")}:${String(s.minute).padStart(2, "0")} ${s.ampm}.`,
            type: "rescheduled",
            targetId: s._id || s.id,
            date: s.date,
          });
        }
      });

      setNotifications(list);
    } catch (err) {
      console.error("loadNotifications error:", err);
    }
  };

  useEffect(() => {
    let checkUser;
    if (clerk.user) {
      loadNotifications();
    } else {
      checkUser = setInterval(() => {
        if (clerk.user) {
          loadNotifications();
          clearInterval(checkUser);
        }
      }, 1000);
    }
    return () => clearInterval(checkUser);
  }, [clerk.user]);

  useEffect(() => {
    if (!clerk.user) return;
    const interval = setInterval(loadNotifications, 20000);
    return () => clearInterval(interval);
  }, [clerk.user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /*
    Hide navbar when scrolling down
    Show navbar when scrolling up
  */
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setShowNavbar(false);
      } else {
        setShowNavbar(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  /*
    Sync doctor login state across tabs
  */
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        setIsDoctorLoggedIn(Boolean(e.newValue));
      }
    };

    window.addEventListener("storage", onStorage);

    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /*
    Close mobile menu when clicking outside navbar
  */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && navRef.current && !navRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  /*
    Close mobile menu on route change
  */
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const navItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Doctors", href: "/doctors", icon: Stethoscope },
    { label: "Services", href: "/services", icon: Briefcase },
    { label: "Appointments", href: "/appointments", icon: CalendarCheck },
    { label: "Contact", href: "/contact", icon: MessageSquare },
  ];

  return (
    <>
      {/* Spacer to account for fixed navbar */}
      <div className="h-[4.75rem] sm:h-[5.25rem]" />

      <div className={navbarStyles.navbarWrapper}>
        <div className={navbarStyles.navbarBorder} />
        <nav
          ref={navRef}
          className={`${navbarStyles.navbarContainer} ${
            showNavbar
              ? navbarStyles.navbarVisible
              : navbarStyles.navbarHidden
          }`}
        >
          <div className={navbarStyles.contentWrapper}>
            <div className={navbarStyles.flexContainer}>

              {/* Logo Section */}
              <Link to="/" className={navbarStyles.logoLink}>
                <div className={navbarStyles.logoContainer}>
                  <div className={navbarStyles.logoImageWrapper}>
                    <img src={logo} alt="logo" className={navbarStyles.logoImage} />
                  </div>
                </div>

                <div className={navbarStyles.logoTextContainer}>
                  <h1 className={navbarStyles.logoTitle}>Medi-Flow</h1>
                  <p className={navbarStyles.logoSubtitle}>HealthCare Solution</p>
                </div>
              </Link>

              {/* Desktop Navigation */}
              <div className={navbarStyles.desktopNav}>
                <div className={navbarStyles.navItemsContainer}>
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={`${navbarStyles.navItem} ${
                          isActive
                            ? navbarStyles.navItemActive
                            : navbarStyles.navItemInactive
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Right Side Actions */}
              <div className={navbarStyles.rightContainer}>
                <SignedOut>
                  <Link
                    to="/doctor-admin/login"
                    className={navbarStyles.doctorAdminButton}
                  >
                    <User className={navbarStyles.doctorAdminIcon} />
                    <span className={navbarStyles.doctorAdminText}>
                      Doctor Admin
                    </span>
                  </Link>

                  <button
                    onClick={() => clerk.openSignIn()}
                    className={navbarStyles.loginButton}
                  >
                    <LogIn className={navbarStyles.loginIcon} />
                    Log-in
                  </button>
                </SignedOut>

                <SignedIn>
                  <div className="flex items-center gap-4 mr-2">
                    {/* Notification Bell */}
                    <div ref={bellRef} className="relative flex items-center">
                      <button
                        onClick={() => {
                          setShowNotifications(!showNotifications);
                          loadNotifications();
                        }}
                        className="relative p-2 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-full transition-all duration-200 cursor-pointer"
                        title="Notifications"
                      >
                        <Bell className="w-5 h-5" />
                        {notifications.length > 0 && (
                          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white rounded-full flex items-center justify-center text-[9px] font-extrabold border border-white animate-pulse">
                            {notifications.length}
                          </span>
                        )}
                      </button>

                      {/* Dropdown panel */}
                      {showNotifications && (
                        <div className="absolute right-0 mt-[16rem] w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-sky-100/50 p-4 z-50 text-slate-800 text-xs font-sans ring-1 ring-sky-500/10 max-h-[380px] overflow-y-auto">
                          <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                            <span className="font-extrabold text-sm text-sky-950">Notifications</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{notifications.length} active</span>
                          </div>

                          <div className="space-y-2.5">
                            {notifications.length === 0 ? (
                              <div className="text-center py-6 text-slate-400 font-medium">
                                No new notifications.
                              </div>
                            ) : (
                              notifications.map((n) => (
                                <div
                                  key={n.id}
                                  onClick={() => {
                                    setShowNotifications(false);
                                    navigate(`/appointments?highlight=${n.targetId}`);
                                  }}
                                  className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer text-left hover:scale-[1.01] hover:shadow-md ${
                                    n.type === "missed"
                                      ? "bg-rose-50/70 border-rose-100 hover:bg-rose-50"
                                      : n.type === "approved"
                                      ? "bg-emerald-50/70 border-emerald-100 hover:bg-emerald-50"
                                      : n.type === "rescheduled"
                                      ? "bg-sky-50/80 border-sky-100 hover:bg-sky-50"
                                      : "bg-amber-50/70 border-amber-100 hover:bg-amber-50"
                                    }`}
                                  >
                                  <div className="font-bold text-[11px] mb-0.5 flex justify-between items-center">
                                    <span className={
                                      n.type === "missed"
                                        ? "text-rose-800"
                                        : n.type === "approved"
                                        ? "text-emerald-800"
                                        : n.type === "rescheduled"
                                        ? "text-sky-800"
                                        : "text-amber-800"
                                      }>{n.title}</span>
                                  </div>
                                  <p className="text-[10.5px] text-slate-600 leading-snug font-medium">
                                    {n.message}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <UserButton afterSignOutUrl="/" />
                  </div>
                </SignedIn>

                {/* Mobile Toggle Button */}
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className={navbarStyles.mobileToggle}
                >
                  {isOpen ? (
                    <X className={navbarStyles.toggleIcon} />
                  ) : (
                    <Menu className={navbarStyles.toggleIcon} />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {isOpen && (
            <div className={navbarStyles.mobileMenu}>
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`${navbarStyles.mobileMenuItem} ${
                      isActive
                        ? navbarStyles.mobileMenuItemActive
                        : navbarStyles.mobileMenuItemInactive
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}

              <SignedOut>
                <Link
                  to="/doctor-admin/login"
                  className={navbarStyles.mobileDoctorAdminButton}
                >
                  <User className="w-4 h-4" />
                  Doctor Admin
                </Link>

                <button
                  onClick={() => clerk.openSignIn()}
                  className={navbarStyles.mobileLoginButton}
                >
                  <LogIn className="w-4 h-4" />
                  Log-in
                </button>
              </SignedOut>

              <SignedIn>
                <div className={navbarStyles.mobileUserWrapper}>
                  <UserButton afterSignOutUrl="/" />
                  <SignOutButton>
                    <button className={navbarStyles.mobileLogoutButton}>
                      Log-out
                    </button>
                  </SignOutButton>
                </div>
              </SignedIn>
            </div>
          )}

          <style>{navbarStyles.animationStyles}</style>
        </nav>
      </div>
    </>
  );
}

export default Navbar;
