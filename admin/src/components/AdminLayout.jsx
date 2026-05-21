import React from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { adminLayoutStyles as als } from "../assets/dummyStyles.js";

/**
 * AdminLayout
 * ─────────────────────────────────────────────────────
 * Mobile  (< md)  : Shows the existing Navbar with its
 *                   hamburger drawer — UNCHANGED.
 * Tablet+ (md+)   : Hides the Navbar, shows the fixed
 *                   left Sidebar instead. Content area
 *                   is offset by the sidebar width.
 */
const AdminLayout = ({ children }) => {
  return (
    <div className={als.wrapper}>
      {/* ── Mobile: existing Navbar (hidden on md+) ── */}
      <div className={als.mobileNavWrapper}>
        <Navbar />
      </div>

      {/* ── Tablet+: Left Sidebar (hidden on mobile) ── */}
      <Sidebar />

      {/* ── Main content area ── */}
      <main className={als.contentWrapper}>
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
