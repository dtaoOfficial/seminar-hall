// src/components/Navbar.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "./ThemeToggle";
import AnimatedButton from "../components/AnimatedButton";
import AuthService from "../utils/AuthService";
import api from "../utils/api"; 
import { useNotification } from "./NotificationsProvider"; 

const LINKS_ADMIN = [
  { to: "/admin", label: "Dashboard", exact: true },
  { to: "/admin/add-user", label: "Add User" },
  { to: "/admin/add-seminar", label: "Add Seminar" },
  { to: "/admin/requests", label: "Requests" },
  { to: "/admin/seminars", label: "Venue" },
  { to: "/admin/departments", label: "Dept Creds" },
  { to: "/admin/manage-departments", label: "Manage Depts" },
  { to: "/admin/halls", label: "Manage Halls" },
  { to: "/admin/operators", label: "Venue Operators" },
  { to: "/admin/logs", label: "Logs" }, // ✅ Added Logs Link
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
  const [isMobile, setIsMobile] = useState(false);

  const [notifOpen, setNotifOpen] = useState(false);
  const [newReqCount, setNewReqCount] = useState(0);
  const [shake, setShake] = useState(false);
  const [requestsList, setRequestsList] = useState([]);

  const navContainerRef = useRef(null);
  const measureLinkRefs = useRef([]);
  const moreWrapRef = useRef(null);
  const userWrapRef = useRef(null);
  const notifWrapRef = useRef(null);

  const role = (user?.role || "ADMIN").toString().toUpperCase();
  const LINKS = role === "DEPARTMENT" ? LINKS_DEPT : LINKS_ADMIN;
  const [visibleCount, setVisibleCount] = useState(Infinity);

  // --- 1. Notification Polling Logic (Fully Intact) ---
  useEffect(() => {
    if (role !== "ADMIN") return;
    let lastKnownCount = -1;
    const poll = async () => {
      try {
        const res = await api.get("/seminars");
        const all = Array.isArray(res?.data) ? res.data : (res?.data?.seminars || []);
        const pending = all.filter((s) => ["PENDING", "CANCEL_REQUESTED"].includes((s.status || "").toUpperCase()));
        if (lastKnownCount !== -1 && pending.length > lastKnownCount) setShake(true);
        lastKnownCount = pending.length;
        setNewReqCount(pending.length);
        if (notifOpen) setRequestsList(pending);
      } catch (err) { console.warn("Polling failed", err); }
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [role, notifOpen]);

  useEffect(() => {
    if (shake) {
      const t = setTimeout(() => setShake(false), 820);
      return () => clearTimeout(t);
    }
  }, [shake]);

  // --- 2. Measurement Logic (Fully Intact) ---
  const computeVisibleCount = useCallback(() => {
    const container = navContainerRef.current;
    if (!container) return LINKS.length;
    const available = Math.max(0, container.clientWidth);
    const measured = LINKS.map((_, i) => measureLinkRefs.current[i] ? Math.ceil(measureLinkRefs.current[i].getBoundingClientRect().width) : 120);
    const moreWidth = 84;
    const GAP = 8;
    let used = 0; let count = 0;
    for (let i = 0; i < LINKS.length; i++) {
      const w = measured[i];
      const newUsed = used + (count > 0 ? GAP : 0) + w;
      const reserveMore = LINKS.length - (i + 1) > 0 ? GAP + moreWidth : 0;
      if (newUsed + reserveMore <= available) { used = newUsed; count++; } 
      else break;
    }
    return count || 1;
  }, [LINKS]);

  useEffect(() => {
    const doMeasure = () => {
      setIsMobile(window.innerWidth < 768);
      setVisibleCount(computeVisibleCount());
    };
    window.addEventListener("resize", doMeasure);
    doMeasure();
    return () => window.removeEventListener("resize", doMeasure);
  }, [computeVisibleCount]);

  useEffect(() => {
    const onDoc = (e) => {
      if (moreOpen && !moreWrapRef.current?.contains(e.target)) setMoreOpen(false);
      if (userOpen && !userWrapRef.current?.contains(e.target)) setUserOpen(false);
      if (notifOpen && !notifWrapRef.current?.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [moreOpen, userOpen, notifOpen]);

  const onLogout = useCallback(() => {
    AuthService.logout(role);
    handleLogout?.();
    navigate("/", { replace: true });
  }, [handleLogout, navigate, role]);

  const visibleLinks = LINKS.slice(0, visibleCount === Infinity ? LINKS.length : visibleCount);
  const hiddenLinks = LINKS.slice(visibleCount === Infinity ? LINKS.length : visibleCount);

  return (
    <>
      <style>{`
        @keyframes bellShake {
          0%, 100% { transform: rotate(0); }
          20%, 60% { transform: rotate(-15deg); }
          40%, 80% { transform: rotate(15deg); }
        }
        .shake-bell { animation: bellShake 0.8s ease; }
      `}</style>

      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full fixed top-0 left-0 z-50 h-16"
      >
        <div className="w-full h-full backdrop-blur-xl bg-white/60 border-b border-white/20 shadow-sm dark:bg-black/40 dark:border-white/6">
          <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-6 h-full">
            <div className="flex items-center gap-3">
              {isMobile && <button onClick={() => setDrawerOpen(true)} className="text-2xl px-2 dark:text-white">☰</button>}
              <div className="cursor-pointer" onClick={() => navigate(role === "DEPARTMENT" ? "/dept" : "/admin")}>
                <img src="https://res.cloudinary.com/duhki4wze/image/upload/v1756755114/nhce_25-scaled-2_a6givc.png" alt="Logo" className="h-10 object-contain" />
              </div>
            </div>

            <div className="flex-1 px-4 min-w-0">
              <nav ref={navContainerRef} className="flex items-center gap-2 whitespace-nowrap overflow-visible">
                {!isMobile && visibleLinks.map((l, i) => (
                  <NavLink key={l.to} ref={(el) => (measureLinkRefs.current[i] = el)} to={l.to} end={l.exact} className={({ isActive }) => `px-3 py-1.5 rounded-md text-sm font-medium transition ${isActive ? "bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow" : "text-slate-700 hover:text-blue-600 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-black/20"}`}>{l.label}</NavLink>
                ))}
                {!isMobile && hiddenLinks.length > 0 && (
                  <div className="relative" ref={moreWrapRef}>
                    <button onClick={() => setMoreOpen(!moreOpen)} className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-white/60 dark:text-slate-200">More ▾</button>
                    <AnimatePresence>
                      {moreOpen && (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg shadow-lg z-[9999] dark:bg-black/80">
                          {hiddenLinks.map((l) => (
                            <NavLink key={l.to} to={l.to} onClick={() => setMoreOpen(false)} className={({ isActive }) => `block px-4 py-2 text-sm transition ${isActive ? "text-blue-600 font-semibold" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-black/20"}`}>{l.label}</NavLink>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </nav>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              {role === "ADMIN" && (
                <div className="relative" ref={notifWrapRef}>
                  <button onClick={() => setNotifOpen(!notifOpen)} className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 relative transition-colors ${shake ? 'shake-bell' : ''}`}>
                    <svg className={`w-6 h-6 ${newReqCount > 0 ? "text-orange-500" : "text-slate-600 dark:text-slate-200"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118.6 14.6V11a6 6 0 10-12 0v3.6c0 .538-.214 1.055-.595 1.445L4 17h5m6 0a3 3 0 11-6 0" /></svg>
                    {newReqCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-black" />}
                  </button>
                  <AnimatePresence>
                    {notifOpen && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-900 border dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                        <div className="p-3 border-b dark:border-white/5 font-bold dark:text-white">Notifications</div>
                        <div className="max-h-64 overflow-y-auto">
                          {requestsList.length === 0 ? <div className="p-4 text-center text-sm text-gray-500">No pending requests</div> : 
                            requestsList.map(item => (
                              <div key={item.id} className="p-3 border-b dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer" onClick={() => navigate('/admin/requests')}>
                                <div className="text-xs font-bold text-blue-500">{item.status}</div>
                                <div className="text-sm dark:text-white truncate">{item.slotTitle || "New Booking Request"}</div>
                                <div className="text-[10px] text-gray-400">{item.department}</div>
                              </div>
                            ))
                          }
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              <ThemeToggle />
              {!isMobile ? (
                <div className="relative" ref={userWrapRef}>
                  <button onClick={() => setUserOpen(!userOpen)} className="flex items-center gap-2 px-2 py-1 rounded-full bg-white/60 border border-white/30 dark:bg-black/40">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">{user?.name?.charAt(0) || "U"}</div>
                    <div className="text-xs text-left hidden sm:block">
                      <div className="font-bold dark:text-white">{user?.name || "Admin"}</div>
                      <div className="text-gray-500 uppercase">{role}</div>
                    </div>
                  </button>
                  <AnimatePresence>
                    {userOpen && (
                      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border dark:border-white/10 rounded-lg shadow-xl overflow-hidden z-50">
                        <button onClick={onLogout} className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium">Logout</button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <AnimatedButton onClick={onLogout} className="text-xs px-3 py-1.5">Logout</AnimatedButton>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawerOpen(false)} className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} className="fixed right-0 top-0 h-full w-72 bg-white dark:bg-zinc-950 z-[70] p-6 shadow-2xl flex flex-col">
               <div className="flex justify-between items-center mb-8">
                 <img src="https://res.cloudinary.com/duhki4wze/image/upload/v1756755114/nhce_25-scaled-2_a6givc.png" className="h-8" alt="Logo" />
                 <button onClick={() => setDrawerOpen(false)} className="text-xl">✕</button>
               </div>
               <nav className="flex flex-col gap-2 overflow-y-auto">
                 {LINKS.map(l => (
                   <NavLink key={l.to} to={l.to} onClick={() => setDrawerOpen(false)} className={({isActive}) => `px-4 py-3 rounded-lg font-medium transition ${isActive ? "bg-blue-600 text-white" : "dark:text-white hover:bg-gray-100 dark:hover:bg-white/5"}`}>{l.label}</NavLink>
                 ))}
               </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}