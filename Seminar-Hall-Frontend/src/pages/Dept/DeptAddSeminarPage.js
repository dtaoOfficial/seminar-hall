import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";
import api from "../../utils/api";
import { useTheme } from "../../contexts/ThemeContext";
import { useNotification } from "../../components/NotificationsProvider";

// Import broken down components
import BookingForm from "./BookingForm";
import VenueCalendar from "./VenueCalendar";

/* ---------- Constants / Helpers ---------- */

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const ymd = (d) => {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

// ✅ FIX: Start at 6 (6:00 AM) and End at 23 (11:00 PM)
const build15MinOptions = (startHour = 6, endHour = 23) => {
  const out = [];
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === endHour && m > 0) continue;
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
};

// ✅ FIX: Generate the list using the new range (6 AM - 11 PM)
const TIME_OPTIONS = build15MinOptions(6, 23);

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

/* ---------- Day bookings modal ---------- */
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
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Bookings on</div>
            <div className="text-lg font-semibold">{prettyDate}</div>
          </div>
          <button type="button" onClick={onClose} className="text-sm px-3 py-1.5 rounded-full bg-slate-200/70 hover:bg-slate-300/80 text-slate-800">Close</button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto max-h-[70vh]">
          {bookings.length === 0 ? (
            <div className={`text-sm text-center py-6 ${isDtao ? "text-slate-300" : "text-slate-600"}`}>No bookings for this date.</div>
          ) : (
            bookings.map((b, idx) => <BookingCard key={b._id || b.id || idx} booking={b} isDtao={isDtao} />)
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function BookingCard({ booking, isDtao }) {
  const [open, setOpen] = useState(false);
  const hallName = booking.hallName || booking.hall?.name || booking.hall || booking.room || booking.venue || "—";
  const title = booking.slotTitle || booking.title || booking.topic || "Untitled";
  const dept = booking.department || booking.dept || booking.departmentName || "—";
  const dateStr = (booking.date || booking.startDate || "").toString().split("T")[0];
  const timeStr = booking.startTime && booking.endTime ? `${to12Label(booking.startTime)} – ${to12Label(booking.endTime)}` : booking.type === "day" ? "Full day" : "—";
  const status = (booking.status || "APPROVED").toString();
  const organizer = booking.bookingName || booking.organizer || booking.requesterName || booking.userName || "—";

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${isDtao ? "bg-black/40 border-violet-800" : "bg-slate-50 border-slate-200"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{dept}</div>
          <div className="font-semibold">{title}</div>
          <div className="text-xs mt-1 text-slate-500">Hall: <span className="font-medium">{hallName}</span></div>
          <div className="text-xs text-slate-500">Date: {dateStr} • Time: {timeStr}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs px-2 py-0.5 rounded-full ${status.toUpperCase() === "APPROVED" ? "bg-emerald-100 text-emerald-700" : status.toUpperCase() === "REJECTED" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{status}</span>
          <button type="button" onClick={() => setOpen((s) => !s)} className="mt-1 text-xs px-3 py-1 rounded-full border border-slate-300 hover:bg-slate-100">{open ? "Hide details" : "More details"}</button>
        </div>
      </div>
      {open && (
        <div className="mt-3 border-t pt-2 text-xs space-y-1 text-slate-500">
          <div><span className="font-semibold">Organizer:</span> {organizer}</div>
          <div><span className="font-semibold">Email:</span> {booking.email || "—"}</div>
          <div><span className="font-semibold">Phone:</span> {booking.phone || booking.mobile || "—"}</div>
          <div><span className="font-semibold">Remarks:</span> {booking.remarks || "—"}</div>
        </div>
      )}
    </div>
  );
}

function SuccessOverlay({ show, isDtao, reduce }) {
  if (!show) return null;
  return (
    <motion.div initial={reduce ? {} : { opacity: 0 }} animate={reduce ? {} : { opacity: 1 }} exit={reduce ? {} : { opacity: 0 }} transition={{ duration: 0.28 }} className="fixed inset-0 z-[60] flex items-center justify-center" aria-hidden={!show}>
      <motion.div initial={reduce ? {} : { scale: 0.98, opacity: 0 }} animate={reduce ? {} : { scale: 1, opacity: 1 }} transition={{ duration: 0.28, type: "spring", stiffness: 350, damping: 28 }} className={`${isDtao ? "rounded-2xl bg-black/80 border border-violet-800 p-6 shadow-xl text-slate-100" : "rounded-2xl bg-white p-6 shadow-xl"}`} style={{ backdropFilter: "blur(6px)" }} role="status">
        <div className="text-lg font-semibold">Request sent!</div>
        <div className={`${isDtao ? "text-slate-300" : "text-slate-600"} text-sm`}>Your seminar request is now PENDING for admin approval.</div>
      </motion.div>
      <motion.div initial={reduce ? {} : { opacity: 0 }} animate={reduce ? {} : { opacity: 1 }} transition={{ duration: 0.36 }} className="absolute inset-0" style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)" }} onClick={(e) => e.stopPropagation()} aria-hidden />
    </motion.div>
  );
}

/* ---------- MAIN COMPONENT ---------- */

export default function DeptAddSeminarPage() {
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";
  const reduce = useReducedMotion();
  const notificationApi = useNotification();
  const location = useLocation();

  const [bookingMode, setBookingMode] = useState("time");
  const [slotTitle, setSlotTitle] = useState("");
  const [bookingName, setBookingName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(new Date());
  
  // ✅ FIX: Start = 09:00 AM (Index 12 in new array) | End = 10:00 AM (Index 16 in new array)
  const [startTime, setStartTime] = useState(TIME_OPTIONS[12] || "09:00");
  const [endTime, setEndTime] = useState(TIME_OPTIONS[16] || "10:00");
  
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [daySlots, setDaySlots] = useState({});
  const [halls, setHalls] = useState([]);
  const [seminars, setSeminars] = useState([]);
  const [selectedHall, setSelectedHall] = useState("");
  const [selectedHallObj, setSelectedHallObj] = useState(null);
  const [lastCheckOk, setLastCheckOk] = useState(false);
  const [lastCheckMessage, setLastCheckMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [, setAppliedAt] = useState("");
  const now = new Date();
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth());
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [showDayModal, setShowDayModal] = useState(false);
  const [dayModalDate, setDayModalDate] = useState("");
  const [dayModalBookings, setDayModalBookings] = useState([]);
  const notifTimerRef = useRef(null);
  const DEFAULT_REMARKS = "Requested by Dept";

  const showNotification = useCallback((msg, type = "info", ms = 3500) => {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    if (notificationApi && typeof notificationApi.notify === "function") {
      notificationApi.notify(msg, type, { autoDismiss: ms });
    }
    if (ms > 0) notifTimerRef.current = setTimeout(() => {}, ms);
  }, [notificationApi]);

  const getLoggedUser = () => {
    try {
      let raw = null;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) || "";
        if (key.includes("seminarhall_dept_user") || key.endsWith("_dept_user") || key.endsWith("_user")) {
          const v = localStorage.getItem(key);
          if (v) { raw = v; break; }
        }
      }
      if (!raw) return null;
      const base = JSON.parse(raw);
      if (!base || typeof base !== "object") return null;
      return { name: base.name || "", email: base.email || "", department: base.department || "", phone: base.phone || "" };
    } catch (e) {
      console.error("Failed to parse dept user from localStorage", e);
      return null;
    }
  };

  const fetchAll = useCallback(async () => {
    try {
      const [hRes, sRes] = await Promise.all([
        api.get("/halls").catch(() => ({ data: [] })),
        api.get("/seminars").catch(() => ({ data: [] })),
      ]);
      const hallsData = Array.isArray(hRes.data) ? hRes.data : [];
      const semData = Array.isArray(sRes.data) ? sRes.data : [];
      setHalls(hallsData);
      setSeminars(semData);
      if (!selectedHall && hallsData.length > 0) {
        const first = hallsData[0];
        setSelectedHall(first.name || first._id || first.id || "");
        setSelectedHallObj(first);
      }
    } catch (err) {
      console.error("Dept fetchAll error:", err);
      showNotification("Error fetching halls / seminars", "error");
    }
  }, [selectedHall, showNotification]);

  useEffect(() => {
    fetchAll();
    return () => { if (notifTimerRef.current) clearTimeout(notifTimerRef.current); };
  }, [fetchAll]);

  useEffect(() => {
    if (!selectedHall) { setSelectedHallObj(null); return; }
    const obj = halls.find((h) => h.name === selectedHall || String(h._id) === String(selectedHall) || String(h.id) === String(selectedHall));
    setSelectedHallObj(obj || null);
  }, [selectedHall, halls]);

  /* ---------- Normalize Seminars ---------- */
  const normalizedBookings = useMemo(() => {
    const map = new Map();
    const toDateKey = (value) => {
      if (!value) return null;
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return null;
      return ymd(d);
    };

    (seminars || []).forEach((s) => {
      try {
        if (String((s.status || "APPROVED")).toUpperCase() !== "APPROVED") return;
        const hallName = s.hallName || s.hall?.name || "";
        const hallId = s.hallId || s.hall?._id || s.hall?.id || "";

        if (s.startDate && s.endDate && !s.daySlots) {
          const sdKey = toDateKey(s.startDate);
          const edKey = toDateKey(s.endDate);
          if (!sdKey || !edKey) return;
          const days = listDatesBetween(new Date(sdKey), new Date(edKey));
          days.forEach((d) => {
            const key = ymd(d);
            const arr = map.get(key) || [];
            arr.push({ date: key, startMin: 0, endMin: 1440, hallName, hallId, original: s, type: "day" });
            map.set(key, arr);
          });
          return;
        }

        if (s.daySlots && typeof s.daySlots === "object") {
          const keys = Object.keys(s.daySlots || {}).sort();
          if (keys.length === 0) return;
          for (const key of keys) {
            const val = s.daySlots[key];
            const arr = map.get(key) || [];
            if (!val) {
              arr.push({ date: key, startMin: 0, endMin: 1440, hallName, hallId, original: s, type: "day" });
            } else {
              const sMin = hhmmToMinutes(val.startTime || val.start);
              const eMin = hhmmToMinutes(val.endTime || val.end);
              if (sMin != null && eMin != null) {
                arr.push({ date: key, startMin: sMin, endMin: eMin, hallName, hallId, original: s, type: "time" });
              } else {
                arr.push({ date: key, startMin: 0, endMin: 1440, hallName, hallId, original: s, type: "day" });
              }
            }
            map.set(key, arr);
          }
          return;
        }

        const dateKey = toDateKey(s.date) || toDateKey(s.startDate) || toDateKey(new Date());
        if (!dateKey) return;
        const arr = map.get(dateKey) || [];
        if (!s.startTime || !s.endTime) {
          arr.push({ date: dateKey, startMin: 0, endMin: 1440, hallName, hallId, original: s, type: "day" });
        } else {
          const sMin = hhmmToMinutes(s.startTime);
          const eMin = hhmmToMinutes(s.endTime);
          if (sMin == null || eMin == null) {
            arr.push({ date: dateKey, startMin: 0, endMin: 1440, hallName, hallId, original: s, type: "day" });
          } else {
            arr.push({ date: dateKey, startMin: sMin, endMin: eMin, hallName, hallId, original: s, type: "time" });
          }
        }
        map.set(dateKey, arr);
      } catch (e) { console.error("normalize seminar error", e); }
    });
    return map;
  }, [seminars]);

  const isDateFullDayBlocked = useCallback((dateStr, hallKey) => {
    const arr = normalizedBookings.get(dateStr) || [];
    return arr.some((b) => (b.type === "day" || (b.startMin === 0 && b.endMin === 1440)) && (b.hallName === hallKey || String(b.hallId) === String(hallKey)));
  }, [normalizedBookings]);

  const getCalendarDayStatus = (dateStr, hallKey) => {
    const arr = normalizedBookings.get(dateStr) || [];
    if (!hallKey) {
      if (arr.length === 0) return "free";
      const full = arr.some((b) => b.type === "day" || (b.startMin === 0 && b.endMin === 1440));
      return full ? "full" : "partial";
    }
    const hallBookings = arr.filter((b) => b.hallName === hallKey || String(b.hallId) === String(hallKey));
    if (hallBookings.length === 0) return "free";
    if (hallBookings.some((b) => b.type === "day" || (b.startMin === 0 && b.endMin === 1440))) return "full";
    return "partial";
  };

  /* ---------- Availability Check ---------- */
  const checkTimeWiseAvailability = () => {
    if (!selectedHall) return { ok: false, msg: "Please select a hall (Venue) first." };
    if (!date) return { ok: false, msg: "Pick a date." };
    if (!startTime || !endTime) return { ok: false, msg: "Pick start & end times." };
    const ds = ymd(date);
    const sMin = hhmmToMinutes(startTime);
    const eMin = hhmmToMinutes(endTime);
    if (sMin == null || eMin == null) return { ok: false, msg: "Invalid time." };
    if (eMin <= sMin) return { ok: false, msg: "Sorry, reverse time not possible." };
    if (isDateFullDayBlocked(ds, selectedHall)) return { ok: false, msg: "Full day booked, not possible." };

    const arr = normalizedBookings.get(ds) || [];
    const overlapping = arr.filter((b) => {
      const hallMatch = b.hallName === selectedHall || String(b.hallId) === String(selectedHall);
      if (!hallMatch) return false;
      return intervalsOverlap(sMin, eMin, b.startMin, b.endMin);
    });

    if (overlapping.length > 0) return { ok: false, msg: "Sorry, this slot is already booked and not available." };
    return { ok: true, msg: `Available ${to12Label(startTime)} — ${to12Label(endTime)} on ${ds}` };
  };

  const checkDayWiseAvailability = () => {
    if (!selectedHall) return { ok: false, msg: "Please select a hall (Venue) first." };
    if (!startDate || !endDate) return { ok: false, msg: "Pick start & end dates." };
    const sd = new Date(startDate); const ed = new Date(endDate);
    sd.setHours(0, 0, 0, 0); ed.setHours(0, 0, 0, 0);
    if (ed < sd) return { ok: false, msg: "End date cannot be before start date." };
    const days = listDatesBetween(sd, ed);
    const conflicts = [];

    for (const d of days) {
      const key = ymd(d);
      const arr = normalizedBookings.get(key) || [];
      const hasAnyBooking = arr.some((b) => b.hallName === selectedHall || String(b.hallId) === String(selectedHall));

      const dsObj = daySlots[key];
      if (dsObj && dsObj.startTime && dsObj.endTime) {
         const sMin = hhmmToMinutes(dsObj.startTime);
         const eMin = hhmmToMinutes(dsObj.endTime);
         if (eMin <= sMin) { conflicts.push(`${key} (Reverse time)`); continue; }
         const overlap = arr.some((b) => {
            const hallMatch = b.hallName === selectedHall || String(b.hallId) === String(selectedHall);
            if (!hallMatch) return false;
            return intervalsOverlap(sMin, eMin, b.startMin, b.endMin);
         });
         if (overlap) { conflicts.push(`${key} (Slot booked)`); }
      } else {
         if (hasAnyBooking) { conflicts.push(`${key} (Already booked)`); }
      }
    }

    if (conflicts.length) return { ok: false, msg: "These days are already booked, booking not possible." };
    return { ok: true, msg: `All selected days available (${ymd(sd)} → ${ymd(ed)})` };
  };

  const doCheckAvailability = async () => {
    setLastCheckOk(false);
    setLastCheckMessage("");
    const res = bookingMode === "day" ? checkDayWiseAvailability() : checkTimeWiseAvailability();
    setLastCheckOk(!!res.ok);
    setLastCheckMessage(res.msg);
    showNotification(res.msg, res.ok ? "success" : "warn", res.ok ? 3000 : 7000);
    return res;
  };

  const resetForm = () => {
    setSlotTitle("");
    setStartTime(TIME_OPTIONS[12] || "09:00");
    setEndTime(TIME_OPTIONS[16] || "10:00");
    setStartDate(new Date());
    setEndDate(new Date());
    setDaySlots({});
    setLastCheckOk(false);
    setLastCheckMessage("");
    showNotification("Form cleared.", "info", 1500);
  };

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    const res = bookingMode === "day" ? checkDayWiseAvailability() : checkTimeWiseAvailability();
    if (!res.ok) {
      setLastCheckOk(false);
      setLastCheckMessage(res.msg);
      showNotification(res.msg, "warn", 6000);
      return;
    }
    if (!slotTitle || !slotTitle.trim()) { showNotification("Event name required", "warn"); return; }
    if (!email || !bookingName || !department || !phone) { showNotification("Profile info missing. Please login again.", "warn"); return; }

    try {
      const nowIso = new Date().toISOString();
      const payload = bookingMode === "time" ? {
        hallName: selectedHall || selectedHallObj?.name, slot: "Custom", slotTitle, bookingName, email, department, phone, status: "PENDING", remarks: DEFAULT_REMARKS, appliedAt: nowIso, date: ymd(date), startTime, endTime
      } : {
        hallName: selectedHall || selectedHallObj?.name, slot: "DayRange", slotTitle, bookingName, email, department, phone, status: "PENDING", remarks: DEFAULT_REMARKS, appliedAt: nowIso, startDate: ymd(startDate), endDate: ymd(endDate), daySlots: (() => {
          const dList = listDatesBetween(startDate, endDate);
          const out = {};
          dList.forEach((d) => {
             const k = ymd(d);
             const ds = daySlots[k];
             if (ds && ds.startTime && ds.endTime) {
                 out[k] = { startTime: ds.startTime, endTime: ds.endTime };
             } else {
                 out[k] = null;
             }
          });
          return out;
        })()
      };
      await api.post("/seminars", payload);
      await fetchAll();
      resetForm();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1600);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || "Error submitting request";
      showNotification(String(msg), "error", 6000);
    }
  };

  /* ---------- Sync DaySlots (Defaults to Empty/Full Day) ---------- */
  useEffect(() => {
    if (!startDate || !endDate) return;
    const sd = new Date(startDate); const ed = new Date(endDate);
    sd.setHours(0, 0, 0, 0); ed.setHours(0, 0, 0, 0);
    if (ed < sd) return;
    const days = listDatesBetween(sd, ed);
    setDaySlots((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => { 
          if (!days.some((d) => ymd(d) === k)) delete next[k]; 
      });
      return next;
    });
  }, [startDate, endDate]);

  /* ---------- Calendar Calculation ---------- */
  const firstOfMonth = new Date(calendarYear, calendarMonth, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const calendarCells = [];
  for (let i = 0; i < startWeekday; i++) calendarCells.push(null);
  for (let dNum = 1; dNum <= daysInMonth; dNum++) calendarCells.push(dNum);
  const selectedDateForDisplay = bookingMode === "time" ? date : startDate;
  const selectedDateKey = ymd(selectedDateForDisplay);

  const extractIsoDate = (s) => {
    const raw = s.date ?? s.startDate ?? s.appliedAt ?? s.createdAt ?? null;
    if (!raw) return null;
    return String(raw).split("T")[0];
  };

  const handleCalendarDayClick = (dayNumber) => {
    if (!dayNumber) return;
    const d = new Date(calendarYear, calendarMonth, dayNumber);
    if (bookingMode === "time") { setDate(d); } else { setStartDate(d); setEndDate(d); }
    setLastCheckOk(false);
    setLastCheckMessage("");
    const clickedKey = ymd(d);
    const list = (seminars || []).filter((s) => {
      const status = String((s.status || "APPROVED")).toUpperCase();
      if (status !== "APPROVED" && status !== "PENDING") return false;
      const iso = extractIsoDate(s);
      if (!iso || iso !== clickedKey) return false;
      const hallCandidates = [s.hallName, s.hall?.name, s.hall, s.hall_id, s.room, s.venue].filter(Boolean).map(String);
      if (selectedHall) return hallCandidates.some((c) => String(c) === String(selectedHall));
      return true;
    });
    setDayModalDate(clickedKey);
    setDayModalBookings(list);
    setShowDayModal(true);
  };

  /* ---------- Prefill User ---------- */
  useEffect(() => {
    const u = getLoggedUser();
    if (u) {
      if (u.email) setEmail(u.email);
      if (u.name) setBookingName((prev) => prev || u.name);
      if (u.department) setDepartment((prev) => prev || u.department);
      if (u.phone) setPhone((prev) => prev || u.phone);
    }
    const st = location.state || {};
    if (st.selectedHall) setSelectedHall(st.selectedHall);
    if (st.date) { try { const d = new Date(st.date); setDate(d); setStartDate(d); setEndDate(d); } catch {} }
    if (st.selectedStartTime) setStartTime(st.selectedStartTime);
    if (st.selectedEndTime) setEndTime(st.selectedEndTime);
    setAppliedAt(new Date().toISOString());
  }, [location.state]);

  /* ---------- Render ---------- */
  return (
    <div className={`${isDtao ? "min-h-screen p-6 bg-[#08050b] text-slate-100" : "min-h-screen bg-slate-50 p-6"}`}>
      <SuccessOverlay show={showSuccess} isDtao={isDtao} reduce={reduce} />
      {showDayModal && <DayBookingsOverlay isDtao={isDtao} reduce={reduce} date={dayModalDate} bookings={dayModalBookings} onClose={() => setShowDayModal(false)} />}
      
      <motion.div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8" initial={reduce ? {} : { opacity: 0, y: 6 }} animate={reduce ? {} : { opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        
        {/* LEFT: Booking Form */}
        <motion.section initial={reduce ? {} : { opacity: 0, y: 8 }} animate={reduce ? {} : { opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05 }}>
          <BookingForm
            isDtao={isDtao} halls={halls} selectedHall={selectedHall} setSelectedHall={setSelectedHall}
            bookingMode={bookingMode} setBookingMode={setBookingMode} slotTitle={slotTitle} setSlotTitle={setSlotTitle}
            date={date} setDate={setDate} startTime={startTime} setStartTime={setStartTime} endTime={endTime} setEndTime={setEndTime}
            startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} daySlots={daySlots} setDaySlots={setDaySlots}
            bookingName={bookingName} email={email} phone={phone} department={department}
            resetForm={resetForm} doCheckAvailability={doCheckAvailability} handleSubmit={handleSubmit}
            lastCheckOk={lastCheckOk} lastCheckMessage={lastCheckMessage} setLastCheckOk={setLastCheckOk} setLastCheckMessage={setLastCheckMessage}
            ymd={ymd} to12Label={to12Label} TIME_OPTIONS={TIME_OPTIONS} listDatesBetween={listDatesBetween}
          />
        </motion.section>

        {/* RIGHT: Venue Calendar */}
        <motion.aside initial={reduce ? {} : { opacity: 0, y: 8 }} animate={reduce ? {} : { opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.08 }}>
          <VenueCalendar
            isDtao={isDtao} calendarMonth={calendarMonth} setCalendarMonth={setCalendarMonth}
            calendarYear={calendarYear} setCalendarYear={setCalendarYear} MONTH_NAMES={MONTH_NAMES}
            calendarCells={calendarCells} getCalendarDayStatus={getCalendarDayStatus} selectedHall={selectedHall}
            selectedDateKey={selectedDateKey} handleCalendarDayClick={handleCalendarDayClick} selectedHallObj={selectedHallObj}
            slotTitle={slotTitle} bookingMode={bookingMode} date={date} startDate={startDate} endDate={endDate}
            startTime={startTime} endTime={endTime} ymd={ymd} to12Label={to12Label}
          />
        </motion.aside>

      </motion.div>
    </div>
  );
}