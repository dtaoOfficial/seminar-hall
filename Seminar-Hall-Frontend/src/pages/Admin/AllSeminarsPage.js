// src/pages/Admin/AllSeminarsPage.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion"; // Added for Kyr smoothness
import api from "../../utils/api";
import { useNotification } from "../../components/NotificationsProvider";
import { useTheme } from "../../contexts/ThemeContext";

/**
 * AllSeminarsPage — Enhanced UI Version
 * Logic: Full preservation of deduping, normalization, and wheel-scroll.
 * UI: Glass theme, smooth transitions, premium status pills.
 */

const STATUS_APPROVED = "APPROVED";
const STATUS_PENDING = "PENDING";

const AllSeminarsPage = () => {
  const { notify } = useNotification();
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  const [loading, setLoading] = useState(true);
  const [seminars, setSeminars] = useState([]);
  const [error, setError] = useState("");
  const [isDesktopView, setIsDesktopView] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(min-width: 768px)").matches;
    }
    return true;
  });

  // filters
  const [filterDept, setFilterDept] = useState("");
  const [filterTitle, setFilterTitle] = useState("");
  const [filterHall, setFilterHall] = useState("");

  // Change-hall modal
  const [changeHallOpen, setChangeHallOpen] = useState(false);
  const [changeTarget, setChangeTarget] = useState(null); 
  const [hallsList, setHallsList] = useState([]);
  const [hallsLoading, setHallsLoading] = useState(false);
  const [updatingHall, setUpdatingHall] = useState(false);

  // transient inline confirmation map
  const [confirmMap, setConfirmMap] = useState({});

  const tableScrollRef = useRef(null);

  // --- Logic Block: Normalization (Fully Preserved) ---
  const normalizeSeminar = (s) => ({
    id: s.id ?? s._id ?? s.seminarId ?? `seminar-${Math.random()}`,
    hallName: s.hallName ?? s.hall ?? "",
    slotTitle: s.slotTitle ?? s.title ?? s.topic ?? "",
    bookingName: s.bookingName ?? s.organizer ?? s.requesterName ?? "",
    email: s.email ?? s.organizerEmail ?? "",
    department: s.department ?? s.dept ?? "",
    phone: s.phone ?? s.contact ?? "",
    slot: s.slot ?? "Custom",
    date: s.date ?? "",
    startTime: s.startTime ?? s.start_time ?? s.from ?? "",
    endTime: s.endTime ?? s.end_time ?? s.to ?? "",
    status: (s.status ?? STATUS_APPROVED).toString().toUpperCase(),
    remarks: s.remarks ?? s.note ?? "",
    appliedAt: s.appliedAt ?? s.createdAt ?? "",
    cancellationReason: s.cancellationReason ?? "",
    createdBy: s.createdBy ?? "",
    source: "seminar",
  });

  const normalizeRequest = (r) => ({
    id: r.id ?? r._id ?? r.requestId ?? `req-${Math.random()}`,
    hallName: r.hallName ?? r.requestedHall ?? "",
    slotTitle: r.slotTitle ?? r.requestTitle ?? "",
    bookingName: r.bookingName ?? r.requesterName ?? "",
    email: r.email ?? r.requesterEmail ?? "",
    department: r.department ?? r.dept ?? "",
    phone: r.phone ?? r.contact ?? "",
    slot: r.slot ?? "Custom",
    date: r.date ?? r.requestedDate ?? "",
    startTime: r.startTime ?? r.requestedStartTime ?? "",
    endTime: r.endTime ?? r.requestedEndTime ?? "",
    status: (r.status ?? STATUS_PENDING).toString().toUpperCase(),
    remarks: r.remarks ?? r.note ?? "",
    appliedAt: r.appliedAt ?? r.createdAt ?? "",
    source: "request",
  });

  const ensureArray = (res) => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (res.data && Array.isArray(res.data)) return res.data;
    if (res.seminars && Array.isArray(res.seminars)) return res.seminars;
    if (res.requests && Array.isArray(res.requests)) return res.requests;
    if (res.data && res.data.seminars && Array.isArray(res.data.seminars)) return res.data.seminars;
    return [];
  };

  // --- Logic Block: Fetching & Deduping (Fully Preserved) ---
  const fetchSeminars = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [seminarRes, requestRes] = await Promise.allSettled([api.get("/seminars"), api.get("/requests")]);

      const rawSeminars = seminarRes.status === "fulfilled" ? ensureArray(seminarRes.value.data ?? seminarRes.value) : [];
      const rawRequests = requestRes.status === "fulfilled" ? ensureArray(requestRes.value.data ?? requestRes.value) : [];

      const seminarList = rawSeminars.map(normalizeSeminar);
      const requestList = rawRequests.map(normalizeRequest);

      const seen = new Map();
      const keyFor = (it) =>
        `${(it.hallName || "").trim()}|${(it.date || "").trim()}|${(it.startTime || "").trim()}|${(it.endTime || "").trim()}|${(it.slotTitle || "").trim()}`;

      const pushIfNew = (item) => {
        const k = keyFor(item);
        if (!seen.has(k)) seen.set(k, item);
        else {
          const existing = seen.get(k);
          if (existing.source === "request" && item.source === "seminar") seen.set(k, item);
        }
      };

      seminarList.forEach(pushIfNew);
      requestList.forEach(pushIfNew);

      const combined = Array.from(seen.values()).sort((a, b) => {
        const da = (a.date || "").split("T")[0];
        const db = (b.date || "").split("T")[0];
        if (da > db) return -1;
        if (da < db) return 1;
        return String(b.id).localeCompare(String(a.id));
      });

      setSeminars(combined);
      console.debug("Fetched", { combined: combined.length });
    } catch (err) {
      console.error("Fetch error", err);
      setError("Failed to fetch data.");
      notify("Failed to fetch seminars/requests", "error", 3500);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { fetchSeminars(); }, [fetchSeminars]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = (ev) => setIsDesktopView(Boolean(ev.matches));
    setIsDesktopView(Boolean(mq.matches));
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const formatAppliedAt = (isoOrStr) => {
    if (!isoOrStr) return "--";
    try {
      const d = new Date(isoOrStr);
      return isNaN(d.getTime()) ? isoOrStr : d.toLocaleString();
    } catch { return isoOrStr; }
  };

  // --- Logic Block: Delete (Kept Intact) ---
  const handleDelete = async (item) => {
    const ok = window.confirm(`Delete this ${item.source === "request" ? "booking request" : "seminar"}?`);
    if (!ok) return;

    try {
      if (item.source === "request") {
        await api.delete(`/requests/${item.id}`);
      } else {
        await api.delete(`/seminars/${item.id}`);
      }
      setSeminars((prev) => prev.filter((s) => s.id !== item.id));
      notify("Deleted successfully", "success", 2200);
    } catch (err) {
      const serverMsg = (err.response && (err.response.data?.message || err.response.data)) || err.message || "Failed to delete";
      notify(String(serverMsg), "error", 4000);
    }
  };

  // --- Filters ---
  const filteredSeminars = seminars.filter((s) => {
    if (filterDept && !(s.department || "").toLowerCase().includes(filterDept.toLowerCase())) return false;
    if (filterTitle && !(s.slotTitle || "").toLowerCase().includes(filterTitle.toLowerCase())) return false;
    if (filterHall && !(s.hallName || "").toLowerCase().includes(filterHall.toLowerCase())) return false;
    return true;
  });

  // --- Logic Block: Hall Loading ---
  const loadHalls = async () => {
    setHallsLoading(true);
    try {
      let remote = [];
      try {
        const res = await api.get("/halls");
        if (res && Array.isArray(res.data)) remote = res.data.map((h) => (typeof h === "string" ? h : h.name || h.hallName || h.id));
      } catch (e) {}
      
      if (remote.length > 0) {
        setHallsList(remote);
      } else {
        const uniques = Array.from(new Set(seminars.map((s) => (s.hallName || "").trim()).filter(Boolean))).sort();
        setHallsList(uniques);
      }
    } catch (err) {
      console.error("Error loading halls:", err);
      setHallsList([]);
    } finally {
      setHallsLoading(false);
    }
  };

  const openChangeHall = async (seminar) => {
    setChangeTarget(seminar);
    setChangeHallOpen(true);
    if (hallsList.length === 0) await loadHalls();
  };

  const closeChangeHall = () => {
    setChangeHallOpen(false);
    setChangeTarget(null);
  };

  // --- Logic Block: PUT Hall Update (Kept Intact) ---
  const confirmChangeHall = async (seminarId, newHallName) => {
    if (!seminarId) return;
    setUpdatingHall(true);
    try {
      await api.put(`/seminars/${seminarId}`, { hallName: newHallName });
      setSeminars((prev) => prev.map((s) => (s.id === seminarId ? { ...s, hallName: newHallName } : s)));

      setConfirmMap((prev) => ({
        ...prev,
        [seminarId]: { hall: newHallName, expiresAt: Date.now() + 5000 }
      }));
      
      setTimeout(() => {
        setConfirmMap((prev) => {
          const next = { ...prev };
          if (next[seminarId] && Date.now() >= next[seminarId].expiresAt) delete next[seminarId];
          return next;
        });
      }, 5200);

      notify("Hall updated", "success", 2200);
      closeChangeHall();
    } catch (err) {
      notify(err?.response?.data?.message || "Failed to update hall", "error", 3500);
    } finally {
      setUpdatingHall(false);
    }
  };

  // --- Logic Block: Mouse Wheel Scroll (Fully Preserved) ---
  const handleWheel = useCallback((e) => {
    if (Math.abs(e.deltaX) > 0) return;
    const el = e.currentTarget;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    e.preventDefault();
    el.scrollLeft += e.deltaY;
  }, []);

  // --- Kyr UI Styling Helpers ---
  const glassCard = isDtao ? "bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl" : "bg-white/80 border-white/40 backdrop-blur-md shadow-xl shadow-blue-500/5";

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className={`min-h-screen pt-24 pb-12 transition-colors duration-500 ${isDtao ? "bg-[#08050b] text-slate-100" : "bg-slate-50 text-slate-900"}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Master <span className="text-blue-500">Record List</span></h1>
            <p className="text-sm opacity-60 mt-1">Full synchronization of seminars and venue requests</p>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={fetchSeminars}
              className={`px-6 py-3 rounded-2xl font-bold text-sm shadow-lg transition-all ${isDtao ? "bg-violet-600 text-white" : "bg-white border text-slate-700"}`}
            >
              Refresh Data
            </motion.button>
          </div>
        </motion.div>

        {/* Filter Grid (Kyr Glassy Design) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { p: "Filter Department", v: filterDept, s: setFilterDept },
            { p: "Filter Title", v: filterTitle, s: setFilterTitle },
            { p: "Filter Hall", v: filterHall, s: setFilterHall }
          ].map((f, idx) => (
            <input 
              key={idx} placeholder={f.p} value={f.v} onChange={(e) => f.s(e.target.value)}
              className={`px-5 py-3 rounded-2xl border outline-none transition-all text-sm ${isDtao ? "bg-white/5 border-white/10 focus:border-violet-500" : "bg-white border-gray-200 focus:border-blue-500"}`}
            />
          ))}
          <button 
            onClick={() => { setFilterDept(""); setFilterTitle(""); setFilterHall(""); }}
            className={`px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest ${isDtao ? "bg-white/5 text-slate-400 hover:text-white" : "bg-slate-200 text-slate-600 hover:bg-slate-300"}`}
          >
            Reset Filters
          </button>
        </div>

        {/* Unified Container */}
        <motion.div 
          layout
          className={`rounded-[2.5rem] border overflow-hidden ${glassCard}`}
        >
          {loading ? (
            <div className="py-32 text-center opacity-40 animate-pulse font-medium">Aggregating records...</div>
          ) : error ? (
            <div className="py-32 text-center text-rose-500 font-bold px-4">{error}</div>
          ) : seminars.length === 0 ? (
            <div className="py-32 text-center opacity-40">No entries found.</div>
          ) : (
            <>
              {isDesktopView && (
                <div 
                  className="w-full overflow-x-auto custom-scrollbar" 
                  onWheel={handleWheel} 
                  ref={tableScrollRef} 
                  tabIndex={0}
                >
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`border-b ${isDtao ? "border-white/10 bg-white/5" : "border-slate-100 bg-slate-50/50"}`}>
                        {["Hall", "Date", "Start", "End", "Title", "Requester", "Dept", "Email", "Phone", "Applied", "Status", "Source", "Action"].map((h, i) => (
                          <th key={i} className="px-6 py-5 text-[10px] font-bold uppercase tracking-[0.2em] opacity-50 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <AnimatePresence>
                        {filteredSeminars.map((s) => (
                          <React.Fragment key={s.id}>
                            <motion.tr 
                              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                              className={`group transition-colors ${isDtao ? "hover:bg-white/5" : "hover:bg-blue-50/50"}`}
                            >
                              <td className="px-6 py-5 whitespace-nowrap font-bold text-blue-500">{s.hallName || "—"}</td>
                              <td className="px-6 py-5 whitespace-nowrap text-sm opacity-80">{(s.date || "").split("T")[0]}</td>
                              <td className="px-6 py-5 whitespace-nowrap text-xs font-medium opacity-60">{s.startTime}</td>
                              <td className="px-6 py-5 whitespace-nowrap text-xs font-medium opacity-60">{s.endTime}</td>
                              <td className="px-6 py-5 max-w-xs truncate font-semibold">{s.slotTitle}</td>
                              <td className="px-6 py-5 whitespace-nowrap text-sm">{s.bookingName}</td>
                              <td className="px-6 py-5 whitespace-nowrap text-xs opacity-60 font-bold">{s.department}</td>
                              <td className="px-6 py-5 max-w-[150px] truncate opacity-60 text-xs">{s.email}</td>
                              <td className="px-6 py-5 whitespace-nowrap text-xs opacity-60">{s.phone}</td>
                              <td className="px-6 py-5 whitespace-nowrap text-xs opacity-40 italic">{formatAppliedAt(s.appliedAt)}</td>
                              <td className="px-6 py-5 whitespace-nowrap">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                                  s.status === STATUS_APPROVED ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                                }`}>{s.status}</span>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap text-[10px] font-bold opacity-30 italic">{s.source}</td>
                              <td className="px-6 py-5 text-right whitespace-nowrap">
                                <div className="flex gap-2">
                                  <button onClick={() => openChangeHall(s)} className="px-4 py-2 rounded-xl bg-sky-500/10 text-sky-500 text-xs font-bold hover:bg-sky-500 hover:text-white transition-all">Update Hall</button>
                                  <button onClick={() => handleDelete(s)} className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                            {confirmMap[s.id] && (
                              <motion.tr initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0 }}>
                                <td colSpan={13} className="px-6 py-3">
                                  <div className={`px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${isDtao ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}>
                                    <div className="w-2 h-2 rounded-full bg-current animate-ping" />
                                    Successfully relocated to: {confirmMap[s.id].hall}
                                  </div>
                                </td>
                              </motion.tr>
                            )}
                          </React.Fragment>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Mobile Card Layout (Kyr Style) */}
              {!isDesktopView && (
                <div className="divide-y divide-white/10">
                  <AnimatePresence>
                    {filteredSeminars.map((s) => (
                      <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-lg truncate">{s.slotTitle || "Untitled Seminar"}</h3>
                            <p className="text-xs text-blue-500 font-bold uppercase tracking-wider">{s.hallName} • {(s.date || "").split("T")[0]}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                            s.status === STATUS_APPROVED ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                          }`}>{s.status}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs opacity-60">
                           <div><strong>Dept:</strong> {s.department}</div>
                           <div><strong>Requester:</strong> {s.bookingName}</div>
                        </div>
                        <div className="flex gap-2 pt-2">
                           <button onClick={() => openChangeHall(s)} className="flex-1 py-3 bg-sky-500/10 text-sky-500 rounded-xl text-xs font-bold">Relocate</button>
                           <button onClick={() => handleDelete(s)} className="flex-1 py-3 bg-red-500/10 text-red-500 rounded-xl text-xs font-bold">Remove</button>
                        </div>
                        {confirmMap[s.id] && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-3 rounded-xl text-[10px] font-bold ${isDtao ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}>
                             Update Success: {confirmMap[s.id].hall}
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}
        </motion.div>
        
        <p className="text-[10px] opacity-30 uppercase tracking-widest text-center mt-6 italic">Note: Seminar data overrides duplicate requests for the same hall/time slot.</p>
      </div>

      {/* Change Hall Modal (Premium Kyr Style) */}
      <AnimatePresence>
        {changeHallOpen && changeTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !updatingHall && closeChangeHall()} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className={`relative w-full max-w-lg p-8 rounded-[3rem] border ${isDtao ? "bg-[#120a1a] border-white/10" : "bg-white border-white"}`}>
              <h3 className="text-xl font-bold mb-1">Update <span className="text-blue-500">Hall Selection</span></h3>
              <p className="text-[10px] uppercase font-bold opacity-40 mb-6 tracking-widest">{changeTarget.slotTitle}</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {hallsLoading ? <div className="col-span-2 text-center py-10 opacity-40">Scanning Venues...</div> : 
                  hallsList.map((h) => (
                    <motion.button 
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      key={h} onClick={() => confirmChangeHall(changeTarget.id, h)} disabled={updatingHall}
                      className={`text-left p-4 rounded-2xl border text-sm font-semibold transition-all ${
                        h === changeTarget.hallName ? "border-blue-500 bg-blue-500/10 text-blue-500" : "border-white/5 bg-white/5 hover:border-white/20"
                      }`}
                    >
                      {h}
                      {h === changeTarget.hallName && <span className="block text-[8px] opacity-50 uppercase mt-1">Currently Selected</span>}
                    </motion.button>
                  ))
                }
              </div>

              <div className="mt-8 flex gap-3">
                <button onClick={closeChangeHall} disabled={updatingHall} className="flex-1 py-4 rounded-2xl font-bold bg-slate-500/10 text-slate-500 text-sm">Cancel</button>
                <button 
                  onClick={() => confirmChangeHall(changeTarget.id, hallsList[0])} 
                  disabled={updatingHall || !hallsList.length}
                  className="flex-1 py-4 rounded-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20 text-sm"
                >
                  {updatingHall ? "Updating..." : "Auto-Assign"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AllSeminarsPage;