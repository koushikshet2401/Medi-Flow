import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useClerk, useUser } from "@clerk/clerk-react";
import {
  Home,
  UserPlus,
  Users,
  Calendar,
  Grid,
  PlusSquare,
  List,
  LogOut,
} from "lucide-react";
import logoImg from "../assets/logo.png";
import { sidebarStyles as ss } from "../assets/dummyStyles.js";

// Navigation configuration — dividers + links
const navConfig = [
  { to: "/h", label: "Dashboard", icon: Home, end: true },

  { type: "divider", label: "Doctors" },
  { to: "/add",          label: "Add Doctor",          icon: UserPlus },
  { to: "/list",         label: "Doctor List",          icon: Users },
  { to: "/appointments", label: "Appointments",         icon: Calendar },

  { type: "divider", label: "Services" },
  { to: "/service-dashboard",    label: "Service Dashboard",   icon: Grid },
  { to: "/add-service",          label: "Add Service",         icon: PlusSquare },
  { to: "/list-service",         label: "List Services",       icon: List },
  { to: "/service-appointments", label: "Service Appointments",icon: Calendar },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const clerk = useClerk?.();
  const { isSignedIn } = useUser();

  const handleSignOut = async () => {
    if (!clerk?.signOut) return;
    try {
      await clerk.signOut();
    } catch (err) {
      console.error("Sign out failed", err);
    } finally {
      try {
        localStorage.removeItem("clerk_token");
      } catch (e) {
        // ignore
      }
      navigate("/");
    }
  };

  return (
    <aside className={ss.sidebar}>
      {/* ── Logo / Brand (non-clickable) ── */}
      <div className={ss.logoSection} style={{ cursor: "default" }}>
        <img src={logoImg} alt="MediFlow logo" className={ss.logoImage} />
        <div className={ss.logoTextContainer}>
          <span className={ss.logoTitle}>MediFlow</span>
          <span className={ss.logoSubtitle}>HealthCare Solutions</span>
        </div>
      </div>

      {/* ── Navigation Links ── */}
      <nav className={ss.navSection}>
        {navConfig.map((item, idx) => {
          // Section divider
          if (item.type === "divider") {
            return (
              <div key={`divider-${idx}`} className={ss.groupLabel}>
                <span className={ss.groupLabelText}>{item.label}</span>
              </div>
            );
          }

          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end ?? false}
              className={({ isActive }) =>
                `${ss.navItemBase} ${
                  isActive ? ss.navItemActive : ss.navItemInactive
                }`
              }
            >
              <Icon size={16} strokeWidth={2} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* ── Sign Out (pinned at bottom) ── */}
      {isSignedIn && (
        <div className={ss.signOutSection}>
          <button onClick={handleSignOut} className={ss.signOutButton}>
            <LogOut size={16} strokeWidth={2} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
