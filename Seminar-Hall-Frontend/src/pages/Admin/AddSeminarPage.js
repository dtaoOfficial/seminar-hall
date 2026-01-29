import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import api from "../../utils/api";
import { useTheme } from "../../contexts/ThemeContext";
import { useNotification } from "../../components/NotificationsProvider";

// Import Components
import AdminBookingForm from "./AdminBookingForm";
import VenueSidebar from "../../components/VenueSidebar"; // Using your existing component

/* ---------- Helpers ---------- */
const ymd = (d) => {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

const hhmmToMinutes = (hhmm) => {
  if (!hhmm) return null;
  const [hh, mm] = hhmm.split(":").map((n) => parseInt(n, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
};

const to12Label = (hhmm) => {
  if (!hhmm) return "";
  const [hh, mm] = hhmm.split(":").map(Number);
  const period = hh >= 12 ? "PM" : "AM";
  const hour12 = ((hh + 11) % 12) + 1;
  return `${String(hour12).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${period}`;
};

const intervalsOverlap = (aStart, aEnd, bStart, bEnd) => {
  if (aStart == null || aEnd == null || bStart == null || bEnd == null) return false;
  return aStart < bEnd && bStart < aEnd;
};

const listDatesBetween = (sd, ed) => {
  const out = [];
  const s = new Date(sd); s.setHours(0, 0, 0, 0);
  const e = new Date(ed); e.setHours(0, 0, 0, 0);
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    out.push(new Date(d));
  }
  return out;
};

/* ---------- Modals ---------- */
function DayBookingsOverlay({ isDtao, reduce, date, bookings, onClose }) {
  const prettyDate = (() => {
    if (!date) return "";
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return date;
    return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  })();

  return (
    <motion.div
      initial={reduce ? {} : { opacity: 0 }} animate={reduce ? {} : { opacity: 1 }} exit={reduce ? {} : { opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[70] flex items-center justify-center"
      aria-modal="true" role="dialog"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={reduce ? {} : { scale: 0.96, opacity: 0 }} animate={reduce ? {} : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.25 }}
        className={`relative max-w-3xl w-[95%] max-h-[80vh] overflow-hidden rounded-2xl shadow-xl ${isDtao ? "bg-[#05010a] border border-violet-900 text-slate-100" : "bg-white"}`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/40">
          <div><div className="text-sm uppercase tracking-[0.14em] text-slate-400">Bookings on</div><div className="text-lg font-semibold">{prettyDate}</div></div>
          <button type="button" onClick={onClose} className="text-sm px-3 py-1.5 rounded-full bg-slate-200/70 hover:bg-slate-300/80 text-slate-800">Close</button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto max-h-[70vh]">
          {bookings.length === 0 ? <div className={`text-sm text-center py-6 ${isDtao ? "text-slate-300" : "text-slate-600"}`}>No bookings for this date.</div> : bookings.map((b, idx) => <BookingCard key={b._id || b.id || idx} booking={b} isDtao={isDtao} />)}
        </div>
      </motion.div>
    </motion.div>
  );
}

function BookingCard({ booking, isDtao }) {
  const [open, setOpen] = useState(false);
  const hallName = booking.hallName || booking.hall?.name || booking.hall || "—";
  const title = booking.slotTitle || "Untitled";
  const dept = booking.department || "—";
  const dateStr = (booking.date || booking.startDate || "").toString().split("T")[0];
  const isRange = booking.startDate && booking.endDate;
  const timeStr = isRange ? "Day Wise / Full Day" : (booking.startTime && booking.endTime ? `${to12Label(booking.startTime)} – ${to12Label(booking.endTime)}` : "Full Day");
  const status = (booking.status || "APPROVED").toString();
  const organizer = booking.bookingName || "—";

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${isDtao ? "bg-black/40 border-violet-800" : "bg-slate-50 border-slate-200"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{dept}</div>
          <div className="font-semibold">{title}</div>
          <div className="text-xs mt-1 text-slate-500">Hall: <span className="font-medium">{hallName}</span></div>
          <div className="text-xs text-slate-500">{isRange ? `Range: ${booking.startDate} to ${booking.endDate}` : `Date: ${dateStr}`} • {timeStr}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs px-2 py-0.5 rounded-full ${status.toUpperCase() === "APPROVED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{status}</span>
          <button type="button" onClick={() => setOpen((s) => !s)} className="mt-1 text-xs px-3 py-1 rounded-full border border-slate-300 hover:bg-slate-100">{open ? "Hide details" : "More details"}</button>
        </div>
      </div>
      {open && <div className="mt-3 border-t pt-2 text-xs space-y-1 text-slate-500"><div><span className="font-semibold">Organizer:</span> {organizer}</div><div><span className="font-semibold">Email:</span> {booking.email}</div><div><span className="font-semibold">Phone:</span> {booking.phone}</div><div><span className="font-semibold">Remarks:</span> {booking.remarks}</div></div>}
    </div>
  );
}

function AnimateSuccessOverlay({ show, isDtao, reduce }) {
  if (!show) return null;
  return (
    <motion.div initial={reduce ? {} : { opacity: 0 }} animate={reduce ? {} : { opacity: 1 }} exit={reduce ? {} : { opacity: 0 }} transition={{ duration: 0.28 }} className="fixed inset-0 z-[60] flex items-center justify-center" aria-hidden={!show}>
      <motion.div initial={reduce ? {} : { scale: 0.98, opacity: 0 }} animate={reduce ? {} : { scale: 1, opacity: 1 }} className={`${isDtao ? "rounded-2xl bg-black/80 border border-violet-800 p-6 shadow-xl text-slate-100" : "rounded-2xl bg-white p-6 shadow-xl"}`} style={{ backdropFilter: "blur(6px)" }}>
        <div className="text-lg font-semibold">Booked!</div><div className={`${isDtao ? "text-slate-300" : "text-slate-600"} text-sm`}>Your booking was saved.</div>
      </motion.div>
      <motion.div initial={reduce ? {} : { opacity: 0 }} animate={reduce ? {} : { opacity: 1 }} className="absolute inset-0" style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)" }} />
    </motion.div>
  );
}

/* ---------- MAIN COMPONENT ---------- */
export default function AddSeminarPage() {
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";
  const reduce = useReducedMotion();
  const globalNotify = useNotification();

  // State
  const [bookingMode, setBookingMode] = useState("time");
  const [slotTitle, setSlotTitle] = useState("");
  const [bookingName, setBookingName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [departmentExtra, setDepartmentExtra] = useState(""); 
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(new Date());
  
  // Default Times (6am start, so indices 12 & 16 are 9am & 10am)
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [daySlots, setDaySlots] = useState({});

  const [halls, setHalls] = useState([]);
  const [seminars, setSeminars] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedHall, setSelectedHall] = useState("");
  const [selectedHallObj, setSelectedHallObj] = useState(null);
  const [loading, setLoading] = useState(true);

  // Calendar
  const now = new Date();
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth());
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());

  // UI
  const [notification, setNotification] = useState("");
  const notifRef = useRef(null);
  const [lastCheckOk, setLastCheckOk] = useState(false);
  const [lastCheckMessage, setLastCheckMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [dayModalDate, setDayModalDate] = useState("");
  const [dayModalBookings, setDayModalBookings] = useState([]);

  const showNotification = useCallback((msg, ms = 3500) => {
    setNotification(msg);
    if (notifRef.current) clearTimeout(notifRef.current);
    if (ms > 0) notifRef.current = setTimeout(() => setNotification(""), ms);
    try { if (globalNotify?.notify) globalNotify.notify(msg, "info", { autoDismiss: ms }); } catch {}
  }, [globalNotify]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [hRes, sRes, dRes] = await Promise.all([
        api.get("/halls"),
        api.get("/seminars"),
        api.get("/departments").catch(() => ({ data: [] })),
      ]);
      setHalls(Array.isArray(hRes.data) ? hRes.data : []);
      setSeminars(Array.isArray(sRes.data) ? sRes.data : []);
      const deps = Array.isArray(dRes.data) ? dRes.data.map((d) => (typeof d === "string" ? d : d?.name)).filter(Boolean) : [];
      setDepartments(deps.length ? deps : ["ADMIN"]);
      if (!selectedHall && Array.isArray(hRes.data) && hRes.data.length) {
        const first = hRes.data[0];
        setSelectedHall(first.name || first._id || first.id || "");
        setSelectedHallObj(first);
      }
    } catch (err) { console.error("fetchAll failed", err); showNotification("Error fetching data"); } finally { setLoading(false); }
  }, [selectedHall, showNotification]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!selectedHall) { setSelectedHallObj(null); return; }
    const obj = halls.find((h) => h.name === selectedHall || String(h._id) === String(selectedHall) || String(h.id) === String(selectedHall));
    setSelectedHallObj(obj || null);
  }, [selectedHall, halls]);

  // Normalized Bookings Logic (Red Calendar Fix)
  const normalizedBookings = useMemo(() => {
    const map = new Map();
    const toDateKey = (value) => {
      if (!value) return null;
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : ymd(d);
    };

    (seminars || []).forEach((s) => {
      try {
        if (String((s.status || "").toUpperCase()) !== "APPROVED") return;
        const hallName = s.hallName || s.hall?.name || "";
        const hallId = s.hallId || s.hall?._id || s.hall?.id || "";

        if (s.startDate && s.endDate) {
          const sdKey = toDateKey(s.startDate);
          const edKey = toDateKey(s.endDate);
          if (!sdKey || !edKey) return;
          const days = listDatesBetween(new Date(sdKey), new Date(edKey));
          days.forEach((d) => {
            const key = ymd(d);
            const arr = map.get(key) || [];
            // Force Full Day (Red) for range bookings
            arr.push({ date: key, startMin: 0, endMin: 1440, hallName, hallId, original: s, type: "day" });
            map.set(key, arr);
          });
          return;
        }

        const dateKey = toDateKey(s.date);
        if (!dateKey) return;
        const arr = map.get(dateKey) || [];
        
        if (!s.startTime || !s.endTime) {
           arr.push({ date: dateKey, startMin: 0, endMin: 1440, hallName, hallId, original: s, type: "day" });
        } else {
           const st = hhmmToMinutes(s.startTime);
           const et = hhmmToMinutes(s.endTime);
           if(st!=null && et!=null) arr.push({ date: dateKey, startMin: st, endMin: et, hallName, hallId, original: s, type: "time" });
        }
        map.set(dateKey, arr);
      } catch (e) {}
    });
    return map;
  }, [seminars]);

  const isDateFullDayBlocked = (dateStr, hall) => {
    const arr = normalizedBookings.get(dateStr) || [];
    return arr.some((b) => (b.type === "day" || (b.startMin === 0 && b.endMin === 1440)) && (b.hallName === hall || String(b.hallId) === String(hall)));
  };

  const getCalendarDayStatus = (dateStr, hall) => {
    const arr = normalizedBookings.get(dateStr) || [];
    if (!hall) {
      if (arr.length === 0) return "free";
      return arr.some((b) => b.type === "day" || (b.startMin === 0 && b.endMin === 1440)) ? "full" : "partial";
    }
    const hallBookings = arr.filter((b) => b.hallName === hall || String(b.hallId) === String(hall));
    if (hallBookings.length === 0) return "free";
    if (hallBookings.some((b) => b.type === "day" || (b.startMin === 0 && b.endMin === 1440))) return "full";
    return "partial";
  };

  // Availability Checks
  const checkTimeWiseAvailability = () => {
    if (!selectedHall) return { ok: false, msg: "Please select a hall." };
    if (!date) return { ok: false, msg: "Pick a date." };
    if (!startTime || !endTime) return { ok: false, msg: "Pick times." };
    const ds = ymd(date);
    const sMin = hhmmToMinutes(startTime);
    const eMin = hhmmToMinutes(endTime);
    if (eMin <= sMin) return { ok: false, msg: "Sorry, reverse time not possible." };
    if (isDateFullDayBlocked(ds, selectedHall)) return { ok: false, msg: "Full day booked, not possible." };

    const arr = normalizedBookings.get(ds) || [];
    const overlapping = arr.filter((b) => {
      const hallMatch = b.hallName === selectedHall || String(b.hallId) === String(selectedHall);
      return hallMatch && intervalsOverlap(sMin, eMin, b.startMin, b.endMin);
    });

    if (overlapping.length > 0) return { ok: false, msg: "Sorry, this slot is not available." };
    return { ok: true, msg: `Available on ${ds}` };
  };

  const checkDayWiseAvailability = () => {
    if (!selectedHall) return { ok: false, msg: "Select a hall." };
    if (!startDate || !endDate) return { ok: false, msg: "Pick dates." };
    const sd = new Date(startDate); sd.setHours(0,0,0,0);
    const ed = new Date(endDate); ed.setHours(0,0,0,0);
    if (ed < sd) return { ok: false, msg: "End date error." };

    const days = listDatesBetween(sd, ed);
    for (const d of days) {
      const key = ymd(d);
      const arr = normalizedBookings.get(key) || [];
      const hasAnyBooking = arr.some(b => b.hallName === selectedHall || String(b.hallId) === String(selectedHall));
      
      const dsObj = daySlots[key];
      if (dsObj && dsObj.startTime && dsObj.endTime) {
         const sMin = hhmmToMinutes(dsObj.startTime);
         const eMin = hhmmToMinutes(dsObj.endTime);
         if (eMin <= sMin) return { ok: false, msg: "Reverse time on " + key };
         const overlap = arr.some(b => {
            const hallMatch = b.hallName === selectedHall || String(b.hallId) === String(selectedHall);
            return hallMatch && intervalsOverlap(sMin, eMin, b.startMin, b.endMin);
         });
         if (overlap) return { ok: false, msg: "Slot conflict on " + key };
      } else {
         if (hasAnyBooking) return { ok: false, msg: "These days are already booked, booking not possible." };
      }
    }
    return { ok: true, msg: "Dates available." };
  };

  const doCheckAvailability = async () => {
    setLastCheckMessage(""); setLastCheckOk(false);
    try {
      const res = bookingMode === "day" ? checkDayWiseAvailability() : checkTimeWiseAvailability();
      setLastCheckOk(!!res.ok);
      setLastCheckMessage(res.msg);
      showNotification(res.msg, res.ok ? 3000 : 7000);
      return res;
    } catch { showNotification("Error checking availability"); return { ok: false }; }
  };

  const resetForm = () => {
    setSlotTitle(""); setBookingName(""); setEmail(""); setPhone(""); setDepartmentExtra("");
    setStartTime("09:00"); setEndTime("10:00");
    setStartDate(new Date()); setEndDate(new Date()); setDaySlots({});
    setLastCheckOk(false); setLastCheckMessage("");
    showNotification("Form cleared", 1200);
  };

  const handleSubmit = async (ev) => {
    ev && ev.preventDefault();
    const res = bookingMode === "day" ? checkDayWiseAvailability() : checkTimeWiseAvailability();
    if (!res.ok) { setLastCheckOk(false); setLastCheckMessage(res.msg); showNotification(res.msg, 6000); return; }
    if (!slotTitle || !bookingName || !email || !phone) { showNotification("Fill all fields"); return; }

    const finalDepartment = departmentExtra && departmentExtra.trim() ? `${department} - ${departmentExtra.trim()}` : department;

    try {
      const nowIso = new Date().toISOString();
      const payload = bookingMode === "time" ? {
        hallName: selectedHall || selectedHallObj?.name, slot: "Custom", slotTitle, bookingName, email, department: finalDepartment, phone, status: "APPROVED", remarks: "Added by Admin", appliedAt: nowIso, date: ymd(date), startTime, endTime
      } : {
        hallName: selectedHall || selectedHallObj?.name, slot: "DayRange", slotTitle, bookingName, email, department: finalDepartment, phone, status: "APPROVED", remarks: "Added by Admin", appliedAt: nowIso, startDate: ymd(startDate), endDate: ymd(endDate), 
        daySlots: (() => {
          const out = {};
          listDatesBetween(startDate, endDate).forEach(d => {
             const k = ymd(d);
             const ds = daySlots[k];
             if(ds && ds.startTime && ds.endTime) out[k] = { startTime: ds.startTime, endTime: ds.endTime };
             else out[k] = null;
          });
          return out;
        })()
      };
      await api.post("/seminars", payload);
      const r = await api.get("/seminars"); setSeminars(r.data || []);
      setShowSuccess(true); setTimeout(() => setShowSuccess(false), 1800);
      showNotification("Booked successfully!", 3000);
      resetForm();
    } catch (err) { showNotification("Error adding seminar!", 6000); }
  };

  /* ---------- Sync DaySlots ---------- */
  useEffect(() => {
    if (!startDate || !endDate) return;
    const sd = new Date(startDate); sd.setHours(0,0,0,0);
    const ed = new Date(endDate); ed.setHours(0,0,0,0);
    if(ed < sd) return;
    const days = listDatesBetween(sd, ed);
    setDaySlots(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => { if(!days.some(d => ymd(d) === k)) delete next[k]; });
        return next;
    });
  }, [startDate, endDate]);

  const handleCalendarDayClick = (dayNumber) => {
    if (!dayNumber) return;
    const d = new Date(calendarYear, calendarMonth, dayNumber);
    if (bookingMode === "time") { setDate(d); } else { setStartDate(d); setEndDate(d); }
    setLastCheckOk(false); setLastCheckMessage("");
    
    const clickedKey = ymd(d);
    const list = (seminars || []).filter((s) => {
      if (String(s.status).toUpperCase() !== "APPROVED") return false;
      // Is range covering this date?
      if (s.startDate && s.endDate) {
          const sd = s.startDate; const ed = s.endDate;
          if (clickedKey >= sd && clickedKey <= ed) return s.hallName === selectedHall;
      }
      return (s.date === clickedKey) && (s.hallName === selectedHall);
    });
    setDayModalDate(clickedKey); setDayModalBookings(list); setShowDayModal(true);
  };

  return (
    <div className={`${isDtao ? "min-h-screen p-6 bg-[#08050b] text-slate-100" : "min-h-screen bg-slate-50 p-6"}`}>
      {notification && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="fixed top-6 left-1/2 -translate-x-1/2 z-50"><div className={`rounded-xl px-4 py-2 shadow-lg ${isDtao ? "bg-black/60 border border-violet-800" : "bg-white border"}`}>{notification}</div></motion.div>}
      <AnimateSuccessOverlay show={showSuccess} isDtao={isDtao} reduce={reduce} />
      {showDayModal && <DayBookingsOverlay isDtao={isDtao} reduce={reduce} date={dayModalDate} bookings={dayModalBookings} onClose={() => setShowDayModal(false)} />}
      
      <motion.div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.section className={`${isDtao ? "bg-black/40 border border-violet-900" : "bg-white"} rounded-2xl p-6 shadow`}>
          <AdminBookingForm 
            isDtao={isDtao} halls={halls} selectedHall={selectedHall} setSelectedHall={setSelectedHall}
            bookingMode={bookingMode} setBookingMode={setBookingMode} slotTitle={slotTitle} setSlotTitle={setSlotTitle}
            date={date} setDate={setDate} startTime={startTime} setStartTime={setStartTime} endTime={endTime} setEndTime={setEndTime}
            startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} daySlots={daySlots} setDaySlots={setDaySlots}
            bookingName={bookingName} setBookingName={setBookingName} email={email} setEmail={setEmail} phone={phone} setPhone={setPhone}
            department={department} setDepartment={setDepartment} departmentExtra={departmentExtra} setDepartmentExtra={setDepartmentExtra} departments={departments}
            resetForm={resetForm} doCheckAvailability={doCheckAvailability} handleSubmit={handleSubmit}
            lastCheckOk={lastCheckOk} lastCheckMessage={lastCheckMessage} setLastCheckOk={setLastCheckOk} setLastCheckMessage={setLastCheckMessage}
            loading={loading} ymd={ymd} listDatesBetween={listDatesBetween}
          />
        </motion.section>
        
        <motion.aside>
          <VenueSidebar 
             isDtao={isDtao} calendarMonth={calendarMonth} setCalendarMonth={setCalendarMonth} calendarYear={calendarYear} setCalendarYear={setCalendarYear}
             bookingMode={bookingMode} date={date} startDate={startDate} endDate={endDate} selectedHall={selectedHall} selectedHallObj={selectedHallObj}
             slotTitle={slotTitle} startTime={startTime} endTime={endTime} getCalendarDayStatus={getCalendarDayStatus} handleCalendarDayClick={handleCalendarDayClick}
             resetForm={resetForm}
          />
        </motion.aside>
      </motion.div>
    </div>
  );
}