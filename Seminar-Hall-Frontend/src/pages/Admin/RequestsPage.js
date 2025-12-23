// src/pages/RequestsPage.js
import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion"; 
import api from "../../utils/api";
import { useNotification } from "../../components/NotificationsProvider";
import { useTheme } from "../../contexts/ThemeContext";

const POLL_INTERVAL_MS = 10000; 
const FILTER_DEBOUNCE_MS = 400;

/* ---------- Accessible Kyr Dropdown ---------- */
function Dropdown({ options = [], value, onChange, className = "", ariaLabel = "Select", placeholder = "" }) {
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const normalized = options.map((o) => (typeof o === "string" ? { value: o, label: o } : { value: o.value, label: o.label ?? o.value }));
  const selectedLabel = (normalized.find((o) => String(o.value) === String(value)) || {}).label ?? "";

  useEffect(() => {
    function onDoc(e) {
      if (!ref.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className={`relative inline-block w-full ${className}`}>
      <motion.button
        whileTap={{ scale: 0.98 }}
        type="button"
        onClick={() => setOpen((s) => !s)}
        className={`w-full text-left rounded-xl px-4 py-2.5 border transition-all flex items-center justify-between ${
          isDtao ? "bg-black border-violet-500/30 text-slate-100" : "bg-white border-gray-200 text-gray-800"
        }`}
      >
        <span className={`text-sm ${selectedLabel ? "font-medium" : "opacity-50"}`}>{selectedLabel || placeholder}</span>
        <svg className={`w-4 h-4 ml-2 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
           <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            /* Increased Z-Index to fix "under text" issue */
            className={`absolute z-[9999] mt-2 w-full rounded-xl shadow-2xl backdrop-blur-xl border ${
              isDtao ? "bg-black border-violet-500/40 text-slate-100" : "bg-white border-gray-200 text-slate-900"
            } overflow-hidden`}
          >
            <div className="max-h-60 overflow-y-auto p-1">
              {normalized.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`px-4 py-2.5 rounded-lg cursor-pointer text-sm transition-colors ${
                    String(opt.value) === String(value) 
                      ? (isDtao ? "bg-violet-600 text-white" : "bg-blue-600 text-white") 
                      : (isDtao ? "hover:bg-white/10" : "hover:bg-gray-100")
                  }`}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const RequestsPage = () => {
  const { notify } = useNotification();
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  const [items, setItems] = useState([]);
  const [searchDeptRaw, setSearchDeptRaw] = useState("");
  const [searchDateRaw, setSearchDateRaw] = useState("");
  const [statusFilterRaw, setStatusFilterRaw] = useState("ALL");

  const [searchDept, setSearchDept] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [remarksMap, setRemarksMap] = useState({});
  const [blinkIds, setBlinkIds] = useState(new Set());
  const [newIdsSet, setNewIdsSet] = useState(new Set());
  const [lastUpdated, setLastUpdated] = useState(null);

  const prevIdsRef = useRef(new Set());
  const pollingRef = useRef(null);
  const mountedRef = useRef(true);
  const blinkTimeoutRef = useRef(null);
  const debounceTimers = useRef({});

  const [rejectModal, setRejectModal] = useState({ open: false, normId: null });
  const mainRef = useRef(null);
  const rejectTextareaRef = useRef(null);
  const [expanded, setExpanded] = useState(() => new Set());

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // --- Debounce Filters ---
  useEffect(() => {
    const timers = debounceTimers.current;
    clearTimeout(timers.dept);
    timers.dept = setTimeout(() => setSearchDept(searchDeptRaw), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timers.dept);
  }, [searchDeptRaw]);

  useEffect(() => {
    const timers = debounceTimers.current;
    clearTimeout(timers.date);
    timers.date = setTimeout(() => setSearchDate(searchDateRaw), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timers.date);
  }, [searchDateRaw]);

  useEffect(() => {
    const timers = debounceTimers.current;
    clearTimeout(timers.status);
    timers.status = setTimeout(() => setStatusFilter(statusFilterRaw), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timers.status);
  }, [statusFilterRaw]);

  const normalizeSeminar = (s) => ({
    ...s,
    __src: "seminar",
    normId: `seminar-${s.id ?? s._id}`,
    status: (s.status ?? "").toString().toUpperCase(),
  });

  const playNotificationSound = (count = 1) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      const playTone = (freq, tStart) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = freq;
        g.gain.setValueAtTime(0, now + tStart);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(now + tStart);
        g.gain.linearRampToValueAtTime(0.12, now + tStart + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + tStart + 0.16);
        o.stop(now + tStart + 0.2);
      };
      playTone(880, 0);
      if (count > 1) playTone(1000, 0.22);
      setTimeout(() => { try { ctx.close(); } catch {} }, 600);
    } catch (err) {}
  };

  const emitNewRequestsEvent = (num) => {
    try { window.dispatchEvent(new CustomEvent("new-requests", { detail: { count: Number(num) } })); } catch {}
  };

  const fetchAll = useCallback(async (silent = false) => {
    try {
      const sRes = await api.get("/seminars");
      if (!Array.isArray(sRes.data)) return;

      const seminars = sRes.data.map(normalizeSeminar).sort((a, b) => {
        const da = new Date(a.appliedAt || a.date || 0).getTime();
        const db = new Date(b.appliedAt || b.date || 0).getTime();
        return db - da; 
      });

      const incomingIds = new Set(seminars.map((it) => it.normId));
      const prevIds = prevIdsRef.current || new Set();
      const newlyAdded = [];
      for (const id of incomingIds) { if (id && !prevIds.has(id)) newlyAdded.push(id); }

      if (!silent && prevIds.size > 0 && newlyAdded.length > 0) {
        notify(`${newlyAdded.length} new request(s)`, "info", 3500);
        playNotificationSound(Math.min(newlyAdded.length, 2));
        emitNewRequestsEvent(newlyAdded.length);
        setBlinkIds(prev => { const n = new Set(prev); newlyAdded.forEach(id => n.add(id)); return n; });
        setNewIdsSet(prev => { const n = new Set(prev); newlyAdded.forEach(id => n.add(id)); return n; });
        setTimeout(() => setBlinkIds(new Set()), 6000);
      }
      
      prevIdsRef.current = incomingIds;
      setRemarksMap(prev => {
        const next = { ...prev };
        seminars.forEach(row => { if (row.normId && !(row.normId in next)) next[row.normId] = row.remarks ?? ""; });
        return next;
      });
      setItems(seminars);
      setLastUpdated(new Date());
    } catch (err) {}
  }, [notify]);

  useEffect(() => {
    fetchAll(true);
    pollingRef.current = setInterval(() => fetchAll(false), POLL_INTERVAL_MS);
    return () => clearInterval(pollingRef.current);
  }, [fetchAll]);

  const saveRemarks = async (normId) => {
    const remarks = (remarksMap[normId] ?? "").trim();
    const [, rawId] = normId.split("-", 2);
    try {
      await api.put(`/seminars/${rawId}`, { remarks });
      notify("Remarks saved", "success", 2200);
      await fetchAll(true);
    } catch (err) { notify("Save failed", "error", 3500); }
  };

  const handleApprove = async (normId) => {
    const [, rawId] = normId.split("-", 2);
    try {
      await api.put(`/seminars/${rawId}`, { status: "APPROVED", remarks: (remarksMap[normId] ?? "").trim() });
      notify("Approved", "success", 2200);
      await fetchAll(true);
    } catch (err) { notify("Approval failed", "error", 3500); }
  };

  const handleReject = async (normId) => {
    const [, rawId] = normId.split("-", 2);
    try {
      await api.put(`/seminars/${rawId}`, { status: "REJECTED", remarks: (remarksMap[normId] ?? "").trim() });
      notify("Rejected", "success", 2200);
      await fetchAll(true);
    } catch (err) { notify("Rejection failed", "error", 3500); }
  };

  const handleConfirmCancel = async (normId) => {
    const [, rawId] = normId.split("-", 2);
    try {
      await api.put(`/seminars/${rawId}`, { status: "CANCELLED", remarks: (remarksMap[normId] ?? "").trim() || "Confirmed" });
      notify("Cancelled", "success", 2200);
      setNewIdsSet(prev => { const n = new Set(prev); n.delete(normId); return n; });
      await fetchAll(true);
    } catch (err) { notify("Cancel failed", "error", 3500); }
  };

  const handleRejectCancel = async (normId) => {
    const [, rawId] = normId.split("-", 2);
    try {
      await api.put(`/seminars/${rawId}`, { status: "APPROVED", remarks: (remarksMap[normId] ?? "").trim() || "Rejected" });
      notify("Cancel rejected", "success", 2200);
      setNewIdsSet(prev => { const n = new Set(prev); n.delete(normId); return n; });
      await fetchAll(true);
    } catch (err) { notify("Failed", "error", 3500); }
  };

  const filteredItems = items.filter((r) => {
    const status = (r.status ?? "").toUpperCase();
    if (statusFilter !== "ALL" && status !== statusFilter) return false;
    if (searchDept && !(r.department ?? "").toLowerCase().includes(searchDept.toLowerCase())) return false;
    if (searchDate && (r.date || "").split("T")[0] !== searchDate) return false;
    return true;
  });

  const formatTime = (t) => t ? new Date(`1970-01-01T${t}`).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }) : "";
  const formatDateNice = (iso) => iso ? new Date(String(iso).split("T")[0]).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";
  const toggleExpanded = (id) => { setExpanded(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };

  const getStatusStyle = (s) => {
    const st = (s ?? "").toUpperCase();
    if (st === "PENDING") return "bg-amber-500/10 text-amber-500";
    if (st === "APPROVED") return "bg-emerald-500/10 text-emerald-500";
    if (st === "REJECTED") return "bg-rose-500/10 text-rose-500";
    if (st === "CANCEL_REQUESTED") return "bg-orange-500/10 text-orange-500";
    return "bg-slate-500/10 text-slate-500";
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`min-h-screen pt-24 pb-12 transition-colors duration-500 ${isDtao ? "bg-[#08050b] text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Booking <span className="text-blue-500">Queue</span></h1>
            <p className="text-sm opacity-60 mt-1">Latest requests appear first. Polling active.</p>
          </div>
          <div className={`px-4 py-2 rounded-2xl border text-xs font-bold ${isDtao ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}>
             Updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : "Syncing..."}
          </div>
        </div>

        {/* Filters */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={`p-6 rounded-[2rem] border backdrop-blur-xl relative z-50 ${isDtao ? "bg-white/5 border-white/10" : "bg-white/80 border-white/40 shadow-xl"}`}>
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 items-end">
            <div className="md:col-span-3">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2 block">Department</label>
              <input type="text" placeholder="Search..." value={searchDeptRaw} onChange={(e) => setSearchDeptRaw(e.target.value)} className={`w-full px-4 py-2.5 rounded-xl border outline-none ${isDtao ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200"}`} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2 block">Date</label>
              <input type="date" value={searchDateRaw} onChange={(e) => setSearchDateRaw(e.target.value)} className={`w-full px-4 py-2.5 rounded-xl border outline-none ${isDtao ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200"}`} />
            </div>
            {/* Slot Dropdown removed as requested */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2 block">Status</label>
              <Dropdown options={[{value: "ALL", label: "All Status"}, "PENDING", "APPROVED", "REJECTED", "CANCEL_REQUESTED", "CANCELLED"]} value={statusFilterRaw} onChange={setStatusFilterRaw} />
            </div>
            <button onClick={() => {setSearchDeptRaw(""); setSearchDateRaw(""); setStatusFilterRaw("ALL");}} className={`px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest ${isDtao ? "bg-white/5 text-slate-400" : "bg-slate-200 text-slate-600"}`}>Reset</button>
          </div>
        </motion.div>

        {/* Requests Feed */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((r) => {
              const id = r.normId;
              const isExpanded = expanded.has(id);
              const blink = blinkIds.has(String(id));
              return (
                <motion.div
                  layout key={id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                  className={`p-6 rounded-3xl border backdrop-blur-md transition-all duration-500 ${
                    blink ? "border-yellow-500 shadow-yellow-500/20 shadow-xl" : isDtao ? "bg-white/5 border-white/5 hover:bg-white/10" : "bg-white border-white/60 hover:shadow-xl"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row justify-between gap-6">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                         <h3 className="font-bold text-lg text-blue-500">{r.hallName || "TBD"}</h3>
                         <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider ${getStatusStyle(r.status)}`}>{r.status}</span>
                         {newIdsSet.has(id) && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                      </div>
                      <div className="text-sm font-bold opacity-80 uppercase tracking-widest">{r.department} • {formatDateNice(r.date)}</div>
                      <div className="flex items-center gap-4 text-xs opacity-50 font-medium">
                         <div className="flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="3"/></svg>{formatTime(r.startTime)} - {formatTime(r.endTime)}</div>
                         <div className="flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="3"/></svg>{r.bookingName}</div>
                      </div>
                      <div className="text-sm font-semibold opacity-70 italic">"{r.slotTitle || "Seminar Booking"}"</div>
                    </div>

                    <div className="w-full lg:w-96 flex flex-col justify-center gap-3">
                      <input type="text" placeholder="Remarks..." value={remarksMap[id] ?? ""} onChange={(e) => setRemarksMap({...remarksMap, [id]: e.target.value})} className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${isDtao ? "bg-white/5 border-white/10 focus:border-violet-500" : "bg-slate-50 border-gray-100 focus:border-blue-500"}`} />
                      <div className="flex gap-2">
                         {r.status === "PENDING" && (
                           <>
                             <button onClick={() => handleApprove(id)} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20">Approve</button>
                             <button onClick={() => setRejectModal({ open: true, normId: id })} className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold">Reject</button>
                           </>
                         )}
                         {r.status === "CANCEL_REQUESTED" && (
                           <>
                             <button onClick={() => handleConfirmCancel(id)} className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-bold">Accept Cancel</button>
                             <button onClick={() => handleRejectCancel(id)} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold">Deny Cancel</button>
                           </>
                         )}
                         <button onClick={() => {saveRemarks(id); setNewIdsSet(prev => {const n=new Set(prev); n.delete(id); return n;})}} className={`px-4 rounded-xl font-bold text-xs ${isDtao ? "bg-white/5 text-white" : "bg-slate-100 text-slate-700"}`}>Save</button>
                         <button onClick={() => toggleExpanded(id)} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold">{isExpanded ? "Less" : "Details"}</button>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className={`mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-2 gap-8 ${isDtao ? "border-white/10" : "border-gray-100"}`}>
                           <div>
                              <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 text-blue-500">Logistics</h4>
                              <div className="space-y-2 text-xs">
                                 <div className="flex justify-between font-medium opacity-70"><span>Email:</span><span>{r.bookingEmail || "—"}</span></div>
                                 <div className="flex justify-between font-medium opacity-70"><span>Phone:</span><span>{r.bookingPhone || "—"}</span></div>
                                 <div className="flex justify-between font-medium opacity-70"><span>Applied:</span><span>{r.appliedAt ? new Date(r.appliedAt).toLocaleString() : "—"}</span></div>
                              </div>
                           </div>
                           <div className="space-y-2">
                              <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 text-blue-500">Day Slots</h4>
                              {r.daySlots ? Object.keys(r.daySlots).map(k => (
                                <div key={k} className="text-xs bg-white/5 p-2 rounded-lg border border-white/5">
                                  <strong>{k}:</strong> {r.daySlots[k] ? `${r.daySlots[k].startTime} - ${r.daySlots[k].endTime}` : "Full Day"}
                                </div>
                              )) : <div className="text-xs opacity-50">Single Day Booking</div>}
                           </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectModal.open && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRejectModal({ open: false, normId: null })} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className={`relative w-full max-w-lg p-8 rounded-[3rem] border ${isDtao ? "bg-[#120a1a] border-white/10 text-white" : "bg-white text-slate-900 shadow-2xl"}`}>
              <h3 className="text-xl font-bold mb-4">Reject <span className="text-rose-500">Booking</span></h3>
              <textarea ref={rejectTextareaRef} value={remarksMap[rejectModal.normId] ?? ""} onChange={(e) => setRemarksMap({...remarksMap, [rejectModal.normId]: e.target.value})} rows="4" placeholder="Enter reason..." className={`w-full p-4 rounded-2xl border outline-none transition-all text-sm ${isDtao ? "bg-white/5 border-white/10" : "bg-slate-50 border-gray-100"}`} />
              <div className="mt-8 flex gap-3">
                <button onClick={() => setRejectModal({ open: false, normId: null })} className="flex-1 py-4 rounded-2xl font-bold bg-slate-500/10 text-slate-500">Cancel</button>
                <button onClick={async () => { const id = rejectModal.normId; if (!id || !(remarksMap[id] ?? "").trim()) { notify("Reason required", "warn", 2200); return; } setRejectModal({ open: false, normId: null }); await handleReject(id); }} className="flex-1 py-4 rounded-2xl font-bold bg-rose-600 text-white">Confirm</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default RequestsPage;