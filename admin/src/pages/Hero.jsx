import React, { useEffect } from "react";
import { useClerk, useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { Shield, Activity, Users, Calendar, Grid } from "lucide-react";
import logoImg from "../assets/logo.png";

const features = [
  { icon: Users,    label: "Doctors",      desc: "Manage doctor profiles & schedules" },
  { icon: Calendar, label: "Appointments", desc: "Doctor & service bookings" },
  { icon: Grid,     label: "Services",     desc: "Hospital services & slots" },
  { icon: Activity, label: "Analytics",    desc: "Dashboard stats & reports" },
];

const Hero = () => {
  const clerk = useClerk?.();
  const { isSignedIn, isLoaded } = useUser();
  const navigate = useNavigate();

  // Auto-redirect to dashboard if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate("/h", { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  const handleSignIn = () => {
    if (clerk?.openSignIn) clerk.openSignIn();
  };

  // Show nothing while Clerk is loading (avoids flash)
  if (!isLoaded) return null;

  return (
    <div
      className="min-h-screen font-serif flex items-center justify-center px-4 py-10 relative overflow-hidden"
      style={{ background: "linear-gradient(145deg, #EBF4FF 0%, #f0f6fd 50%, #dbeeff 100%)" }}
    >
      {/* ── Decorative soft blobs ── */}
      <div
        className="absolute top-[-60px] right-[-60px] w-80 h-80 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #B5D4F4, transparent)" }}
      />
      <div
        className="absolute bottom-[-80px] left-[-40px] w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #85B7EB, transparent)" }}
      />

      {/* ── Card ── */}
      <div className="relative z-10 w-full max-w-lg">
        <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-[#B5D4F4] shadow-2xl shadow-[#85B7EB]/30 p-8 sm:p-10">

          {/* Logo + brand */}
          <div className="flex flex-col items-center mb-6">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 shadow-md"
              style={{ background: "linear-gradient(135deg, #E6F1FB, #B5D4F4)" }}
            >
              <img src={logoImg} alt="MediFlow" className="w-14 h-14 object-contain" />
            </div>
            <h1 className="text-3xl font-extrabold text-[#042C53] tracking-tight">MediFlow</h1>
            <p className="text-xs font-semibold text-[#185FA5] tracking-[0.2em] uppercase mt-1">
              Admin Control Panel
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-[#E6F1FB]" />
            <Shield size={14} className="text-[#85B7EB]" />
            <div className="flex-1 h-px bg-[#E6F1FB]" />
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-2 gap-3 mb-7">
            {features.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="flex items-start gap-2.5 p-3 rounded-2xl border border-[#E6F1FB] bg-[#f7fbff] hover:border-[#85B7EB] hover:bg-[#EBF4FF] transition-all duration-200"
              >
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#E6F1FB] flex items-center justify-center">
                  <Icon size={14} className="text-[#185FA5]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#042C53] leading-tight">{label}</p>
                  <p className="text-[10px] text-[#378ADD] leading-tight mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Description */}
          <p className="text-center text-sm text-[#0C447C]/70 leading-relaxed mb-6">
            Manage hospital operations, doctors, patient records, and system settings from a centralized dashboard.
          </p>

          {/* CTA — always Sign In (signed-in users are auto-redirected above) */}
          <button
            onClick={handleSignIn}
            className="w-full py-3 rounded-xl text-sm font-bold text-white shadow-lg shadow-[#185FA5]/30 hover:shadow-[#185FA5]/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            style={{ background: "linear-gradient(135deg, #185FA5, #378ADD)" }}
          >
            Sign In to Continue →
          </button>

          {/* Footer */}
          <p className="text-center text-[#85B7EB] text-[11px] mt-5">
            Authorised personnel only · MediFlow © 2025
          </p>
        </div>
      </div>
    </div>
  );
};

export default Hero;
