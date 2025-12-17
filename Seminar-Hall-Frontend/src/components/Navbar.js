// src/components/Navbar.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import AnimatedButton from "../components/AnimatedButton";
import api from "../utils/api";
import { useNotification } from "./NotificationsProvider";
import AuthService from "../utils/AuthService";

/* ---------- Link Sets ---------- */
const LINKS_ADMIN = [
  { to: "/admin", label: "Dashboard", exact: true },
  { to: "/admin/add-user", label: "Add User" },
  { to: "/admin/add-seminar", label: "Add Seminar" },
  { to: "/admin/requests", label: "Requests" },
  { to: "/admin/seminars", label: "Venue" },
  { to: "/admin/departments", label: "Dept Creds" },
  { to: "/admin/manage-departments", label: "Manage Depts" },
  { to: "/admin/halls", label: "Manage Halls" },
  { to: "/admin/operators", label: "Venue Operaters" },
];

const LINKS_DEPT = [
  { to: "/dept", label: "Dashboard", exact: true },
  { to: "/dept/history", label: "Approved Halls" },
  { to: "/dept/status", label: "Status" },
];

export default function Navbar({ user = {}, handleLogout }) {
  const navigate = useNavigate();
  const { notify } = useNotification();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const navContainerRef = useRef(null);
  const measureContainerRef = useRef(null);
  const measureLinkRefs = useRef([]);
  const measureMoreRef = useRef(null);
  const moreWrapRef = useRef(null);
  const userWrapRef = useRef(null);

  const [visibleCount, setVisibleCount] = useState(Infinity);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  // Notifications
  const [newReqCount, setNewReqCount] = useState(0);
  const [shake, setShake] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [requestsList, setRequestsList] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const role = (user?.role || "ADMIN").toString().toUpperCase();
  const LINKS = role === "DEPARTMENT" ? LINKS_DEPT : LINKS_ADMIN;

  /* ---------- Layout calculation ---------- */
  const computeVisibleCount = useCallback(() => {
    const container = navContainerRef.current;
    const measureContainer = measureContainerRef.current;
    if (!container || !measureContainer) return LINKS.length;

    const available = Math.max(0, container.clientWidth);
    const measured = LINKS.map((_, i) => {
      const el = measureLinkRefs.current[i];
      return el ? Math.ceil(el.getBoundingClientRect().width) : 120;
    });
    const moreWidth = measureMoreRef.current
      ? Math.ceil(measureMoreRef.current.getBoundingClientRect().width)
      : 84;
    const GAP = 8;
    let used = 0,
      count = 0;

    for (let i = 0; i < LINKS.length; i++) {
      const w = measured[i];
      const newUsed = used + (count > 0 ? GAP : 0) + w;
      const remaining = LINKS.length - (i + 1);
      const reserveMore = remaining > 0 ? GAP + moreWidth : 0;
      if (newUsed + reserveMore <= available) {
        used = newUsed;
        count++;
      } else break;
    }

    if (count === 0 && LINKS.length > 0 && available > 120) count = 1;
    return count;
  }, [LINKS]);

  useEffect(() => {
    let raf = null;
    const doMeasure = () => {
      setIsMobile(window.innerWidth < 768);
      try {
        const v = computeVisibleCount();
        setVisibleCount(v);
      } catch {
        setVisibleCount(LINKS.length);
      }
    };
    const onResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(doMeasure);
    };
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(doMeasure);
    if (navContainerRef.current) ro.observe(navContainerRef.current);
    doMeasure();
    return () => {
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [computeVisibleCount, LINKS.length]);

  useEffect(() => {
    const onDoc = (e) => {
      if (moreOpen && moreWrapRef.current && !moreWrapRef.current.contains(e.target))
        setMoreOpen(false);
      if (userOpen && userWrapRef.current && !userWrapRef.current.contains(e.target))
        setUserOpen(false);
    };
    if (moreOpen || userOpen || notifOpen) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [moreOpen, userOpen, notifOpen]);

  useEffect(() => {
    if (drawerOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow || "";
      };
    }
  }, [drawerOpen]);

  /* ---------- Logout ---------- */
  const onLogout = useCallback(() => {
    try {
      const path = window.location?.pathname || "";
      const detectedRole = path.startsWith("/admin")
        ? "ADMIN"
        : path.startsWith("/dept")
        ? "DEPARTMENT"
        : null;
      AuthService.logout(detectedRole);
      if (typeof handleLogout === "function") handleLogout();
      navigate("/", { replace: true });
    } catch {
      navigate("/", { replace: true });
    }
  }, [handleLogout, navigate]);

  /* ---------- Notifications polling ---------- */
  useEffect(() => {
    if (role !== "ADMIN") return;
    let lastKnownCount = -1;
    const poll = async () => {
      try {
        const res = await api.get("/seminars");
        const all = Array.isArray(res?.data) ? res.data : res?.data?.seminars || [];
        const pending = all.filter((s) =>
          ["PENDING", "CANCEL_REQUESTED"].includes((s.status || "").toUpperCase())
        );
        if (lastKnownCount !== -1 && pending.length > lastKnownCount) setShake(true);
        lastKnownCount = pending.length;
        setNewReqCount(pending.length);
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 1000);
    return () => clearInterval(interval);
  }, [role]);

  useEffect(() => {
    if (shake) {
      const t = setTimeout(() => setShake(false), 820);
      return () => clearTimeout(t);
    }
  }, [shake]);

  const onRequestsClick = () => setNewReqCount(0);

  /* ---------- Fetch pending requests ---------- */
  const notifWrapRef = useRef(null);
  const fetchPendingAndCancels = async () => {
    setLoadingRequests(true);
    try {
      const res = await api.get("/seminars");
      const all = Array.isArray(res?.data) ? res.data : res?.data?.seminars || [];
      const normalized = all.map((s) => ({
        id: s._id ?? s.id,
        hallName: s.hallName || s.hall || "",
        title: s.slotTitle || s.title || "Untitled",
        department: s.department || "",
        date: s.date || s.startDate || null,
        status: (s.status || "").toUpperCase(),
      }));
      const filtered = normalized.filter((n) =>
        ["PENDING", "CANCEL_REQUESTED"].includes(n.status)
      );
      setRequestsList(filtered);
    } catch (err) {
      notify && notify("Failed to fetch requests", "error", 3000);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (notifOpen) {
      setNewReqCount(0);
      fetchPendingAndCancels();
    }
  }, [notifOpen]);

  /* ---------- Render ---------- */
  return (
    <>
      <header className="w-full fixed top-0 left-0 z-50 h-16">
        <div className="w-full h-full backdrop-blur-xl bg-white/60 border-b border-white/20 shadow-sm dark:bg-black/40">
          <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-6 h-full">
            {/* Logo */}
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate(role === "DEPARTMENT" ? "/dept" : "/admin")}
            >
              <img
                src="https://res.cloudinary.com/duhki4wze/image/upload/v1756755114/nhce_25-scaled-2_a6givc.png"
                alt="NHCE"
                className="h-10 w-auto object-contain"
              />
            </div>

            {/* Nav links */}
            <div className="flex-1 px-4">
              <nav ref={navContainerRef} className="flex items-center gap-2 whitespace-nowrap">
                {LINKS.map((l) => {
                  const isRequests = l.to === "/admin/requests";
                  return (
                    <NavLink
                      key={l.to}
                      to={l.to}
                      end={l.exact}
                      onClick={isRequests ? onRequestsClick : undefined}
                      className={({ isActive }) =>
                        `px-3 py-1.5 rounded-md text-sm font-medium transition ${
                          isActive
                            ? "bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow"
                            : "text-slate-700 hover:text-blue-600 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-black/20"
                        }`
                      }
                    >
                      {l.label}
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* Right side controls */}
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              {role === "ADMIN" && (
                <div className="relative" ref={notifWrapRef}>
                  <button
                    title="Notifications"
                    onClick={() => setNotifOpen((s) => !s)}
                    className={`notif-bell ${shake ? "shake" : ""} relative p-2 rounded-md hover:bg-slate-100 dark:hover:bg-white/10`}
                  >
                    <svg
                      className="w-6 h-6 text-slate-700 dark:text-slate-200"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118.6 14.6V11a6 6 0 10-12 0v3.6c0 .538-.214 1.055-.595 1.445L4 17h5m6 0a3 3 0 11-6 0"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {newReqCount > 0 && <span className="nav-red-dot" />}
                  </button>
                </div>
              )}

              {/* Theme toggle */}
              <ThemeToggle />

              {/* User section */}
              <div className="relative" ref={userWrapRef}>
                <button
                  onClick={() => setUserOpen((s) => !s)}
                  className="flex items-center gap-2 px-2 py-1 rounded-full bg-white/60 border border-white/30 backdrop-blur-sm dark:bg-black/40"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                    {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className="text-xs leading-tight">
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {user?.name || "User"}
                    </div>
                    <div className="text-slate-500 dark:text-slate-300">{role || "ADMIN"}</div>
                  </div>
                </button>

                {userOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white/95 border border-slate-200 rounded-lg shadow-lg dark:bg-black/80">
                    <div className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                      <div className="font-semibold">{user?.name || "User"}</div>
                      <div
                        className="text-xs text-slate-500 dark:text-slate-400 truncate"
                        title={user?.email || ""}
                      >
                        {user?.email || ""}
                      </div>
                    </div>
                    <div className="border-t border-slate-100" />
                    <AnimatedButton
                      onClick={() => {
                        setUserOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-4 py-2 text-sm"
                    >
                      Logout
                    </AnimatedButton>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ✅ Mobile Drawer (no server indicator) */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setDrawerOpen(false)}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
        <div
          className={`absolute right-0 w-11/12 sm:w-3/4 bg-white/95 shadow-2xl p-4 transform transition-transform duration-300 dark:bg-black/90 backdrop-blur-md border-l border-white/10`}
          style={{ top: "64px", height: "calc(100vh - 64px)", zIndex: 45 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-2 border-b dark:border-white/6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div>
                <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                  {user?.name || "User"}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-300">{role || "ADMIN"}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                className="text-2xl text-slate-700 dark:text-slate-200 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/6"
                onClick={() => setDrawerOpen(false)}
              >
                ✕
              </button>
            </div>
          </div>

          <nav className="mt-3 flex flex-col gap-1 overflow-y-auto text-sm">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.exact}
                onClick={() => setDrawerOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-black/20"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-4">
            <AnimatedButton
              onClick={() => {
                setDrawerOpen(false);
                onLogout();
              }}
              className="w-full py-2 rounded-md text-sm"
            >
              Logout
            </AnimatedButton>
          </div>
        </div>
      </div>
    </>
  );
}
