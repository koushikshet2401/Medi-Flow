import React, { useEffect, useRef, useState } from "react";
import { navbarStyles } from "../assets/dummyStyles";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  SignOutButton,
  useClerk,
  UserButton,
} from "@clerk/clerk-react";
import { User, Menu, X, LogIn } from "lucide-react";
import logo from "../assets/logo.png";

const STORAGE_KEY = "doctorToken_v1";

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
    { label: "Home", href: "/" },
    { label: "Doctors", href: "/doctors" },
    { label: "Services", href: "/services" },
    { label: "Appointments", href: "/appointments" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <div className={navbarStyles.navbarBorder}>
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
                <UserButton afterSignOutUrl="/" />
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
                  {item.label}
                </Link>
              );
            })}

            <SignedOut>
              <Link
                to="/doctor-admin/login"
                className={navbarStyles.mobileDoctorAdminButton}
              >
                Doctor Admin
              </Link>

              <button
                onClick={() => clerk.openSignIn()}
                className={navbarStyles.mobileLoginButton}
              >
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
  );
}

export default Navbar;
