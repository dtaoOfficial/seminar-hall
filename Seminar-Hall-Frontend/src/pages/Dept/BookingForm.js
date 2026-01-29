import React, { useEffect, useRef, useState } from "react";
import AnimatedButton from "../../components/AnimatedButton";

/* --- 1. DEFINE TIME LOGIC INSIDE HERE TO FORCE UPDATE --- */
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

// ✅ FORCE 6 AM (06) TO 11 PM (23)
const INTERNAL_TIME_OPTIONS = build15MinOptions(6, 23);

const to12LabelInternal = (hhmm) => {
  if (!hhmm) return "";
  const [hh, mm] = hhmm.split(":").map(Number);
  const period = hh >= 12 ? "PM" : "AM";
  const hour12 = ((hh + 11) % 12) + 1;
  return `${String(hour12).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${period}`;
};

/* --- Icons --- */
const CalendarIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);

const ClockIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v6l3 2" />
  </svg>
);

/* --- TimeSelect Component --- */
function TimeSelect({ value, onChange, options, className = "", ariaLabel = "Select time", isDtao = false }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onDoc(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (open) {
      const el = ref.current?.querySelector(`[data-val="${value}"]`);
      if (el?.scrollIntoView) el.scrollIntoView({ block: "nearest" });
    }
  }, [open, value]);

  return (
    <div ref={ref} className={`relative inline-block w-full ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((s) => !s)}
        className={`w-full text-left rounded-md px-3 py-2 border flex items-center justify-between ${
          isDtao ? "bg-transparent border-violet-700 text-slate-100" : ""
        }`}
      >
        {/* Use Internal Label Converter */}
        <span>{to12LabelInternal(value)}</span>
        <svg className={`w-4 h-4 ml-2 ${isDtao ? "text-slate-300" : "text-slate-600"}`} viewBox="0 0 24 24" fill="none">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          tabIndex={-1}
          className={`absolute z-50 mt-1 w-full rounded-md shadow-lg ${
            isDtao ? "bg-black/80 border border-violet-800 text-slate-100" : "bg-white border"
          }`}
          style={{ maxHeight: `${5 * 40}px`, overflowY: "auto" }}
        >
          {options.map((opt) => (
            <div
              key={opt}
              role="option"
              data-val={opt}
              aria-selected={opt === value}
              tabIndex={0}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`px-3 py-2 cursor-pointer ${
                isDtao ? "hover:bg-violet-900/60" : "hover:bg-gray-100"
              } ${
                opt === value ? (isDtao ? "bg-violet-900/70 font-semibold" : "bg-blue-50 font-semibold") : ""
              }`}
            >
              {to12LabelInternal(opt)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BookingForm({
  isDtao,
  halls,
  selectedHall,
  setSelectedHall,
  bookingMode,
  setBookingMode,
  slotTitle,
  setSlotTitle,
  date,
  setDate,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  daySlots,
  setDaySlots,
  bookingName,
  email,
  phone,
  department,
  resetForm,
  doCheckAvailability,
  handleSubmit,
  lastCheckOk,
  lastCheckMessage,
  setLastCheckOk,
  setLastCheckMessage,
  ymd,
  listDatesBetween
}) {
  
  // ✅ USE INTERNAL LIST (6 AM - 11 PM)
  const timeOptions = INTERNAL_TIME_OPTIONS;

  return (
    <div className={`rounded-2xl p-6 shadow ${isDtao ? "bg-black/40 border border-violet-900 text-slate-100" : "bg-white"}`}>
      {/* Venue header with dropdown */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
        <span className="text-xs font-semibold tracking-[0.15em] uppercase">Venue</span>
        <select
          value={selectedHall}
          onChange={(e) => {
            setSelectedHall(e.target.value);
            setLastCheckOk(false);
            setLastCheckMessage("");
          }}
          className={`rounded-md px-3 py-2 border text-sm ${
            isDtao ? "bg-black/40 border-violet-700 text-slate-100" : "bg-white border-gray-300 text-slate-800"
          }`}
        >
          {halls.map((h) => {
            const key = h.name || h._id || h.id;
            return <option key={key} value={h.name || key}>{h.name}</option>;
          })}
        </select>
      </div>

      <div className={`mt-4 flex gap-3 rounded-full p-1 ${isDtao ? "bg-black/30" : "bg-indigo-50"}`}>
        <AnimatedButton
          variant={bookingMode === "time" ? "primary" : "ghost"}
          size="sm"
          onClick={() => { setBookingMode("time"); setLastCheckOk(false); setLastCheckMessage(""); }}
          className="flex-1"
        >
          Time Wise
        </AnimatedButton>
        <AnimatedButton
          variant={bookingMode === "day" ? "primary" : "ghost"}
          size="sm"
          onClick={() => { setBookingMode("day"); setLastCheckOk(false); setLastCheckMessage(""); }}
          className="flex-1"
        >
          Day Wise
        </AnimatedButton>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="mt-6 space-y-4">
        <div>
          <label className={`block text-sm font-medium ${isDtao ? "text-slate-200" : ""}`}>Event Name</label>
          <input
            value={slotTitle}
            onChange={(e) => setSlotTitle(e.target.value)}
            placeholder="Tech Symposium 2025"
            className={`mt-2 w-full rounded-md px-3 py-2 border ${isDtao ? "bg-transparent border-violet-700 text-slate-100" : ""}`}
          />
        </div>

        {bookingMode === "time" ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm ${isDtao ? "text-slate-200" : ""}`}>
                  <span className="inline-flex items-center">
                    <CalendarIcon className={`h-4 w-4 mr-2 ${isDtao ? "text-slate-300" : "text-slate-400"}`} /> Date
                  </span>
                </label>
                <input
                  type="date"
                  value={ymd(date)}
                  onChange={(e) => { setDate(new Date(e.target.value)); setLastCheckOk(false); setLastCheckMessage(""); }}
                  className={`mt-1 w-full rounded-md px-3 py-2 border ${isDtao ? "bg-transparent border-violet-700 text-slate-100" : ""}`}
                />
              </div>
              <div>
                <label className={`block text-sm ${isDtao ? "text-slate-200" : ""}`}>End Date</label>
                <input
                  type="date"
                  value={ymd(date)}
                  readOnly
                  className={`mt-1 w-full rounded-md px-3 py-2 border bg-gray-50 text-slate-500 cursor-not-allowed ${isDtao ? "bg-transparent/10 text-slate-400" : ""}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm ${isDtao ? "text-slate-200" : ""}`}>
                  <span className="inline-flex items-center">
                    <ClockIcon className={`h-4 w-4 mr-2 ${isDtao ? "text-slate-300" : "text-slate-400"}`} /> Start Time
                  </span>
                </label>
                <TimeSelect value={startTime} onChange={(v) => { setStartTime(v); setLastCheckOk(false); setLastCheckMessage(""); }} isDtao={isDtao} options={timeOptions} />
              </div>
              <div>
                <label className={`block text-sm ${isDtao ? "text-slate-200" : ""}`}>
                  <span className="inline-flex items-center">
                    <ClockIcon className={`h-4 w-4 mr-2 ${isDtao ? "text-slate-300" : "text-slate-400"}`} /> End Time
                  </span>
                </label>
                <TimeSelect value={endTime} onChange={(v) => { setEndTime(v); setLastCheckOk(false); setLastCheckMessage(""); }} isDtao={isDtao} options={timeOptions} />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm ${isDtao ? "text-slate-200" : ""}`}>Start Date</label>
                <input
                  type="date"
                  value={ymd(startDate)}
                  onChange={(e) => { setStartDate(new Date(e.target.value)); setLastCheckOk(false); setLastCheckMessage(""); }}
                  className={`mt-1 w-full rounded-md px-3 py-2 border ${isDtao ? "bg-transparent border-violet-700 text-slate-100" : ""}`}
                />
              </div>
              <div>
                <label className={`block text-sm ${isDtao ? "text-slate-200" : ""}`}>End Date</label>
                <input
                  type="date"
                  value={ymd(endDate)}
                  onChange={(e) => { setEndDate(new Date(e.target.value)); setLastCheckOk(false); setLastCheckMessage(""); }}
                  className={`mt-1 w-full rounded-md px-3 py-2 border ${isDtao ? "bg-transparent border-violet-700 text-slate-100" : ""}`}
                />
              </div>
            </div>

            <p className={`${isDtao ? "text-slate-300" : "text-slate-500"} text-sm`}>
              You can set per-day times below (optional). If left blank, that date will be full-day.
            </p>

            <div className="mt-4 space-y-2">
              {listDatesBetween(startDate, endDate).map((d) => {
                const k = ymd(d);
                // Default is null (Full Day) unless user picks
                const ds = daySlots[k] || { startTime: timeOptions[12], endTime: timeOptions[16] };
                return (
                  <div key={k} className={`${isDtao ? "p-3 bg-black/30 rounded border border-violet-800" : "p-3 bg-slate-50 rounded border"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{k}</div>
                        <div className={`text-xs ${isDtao ? "text-slate-300" : "text-slate-500"}`}>Optional per-day time</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-[120px]">
                          <TimeSelect
                            value={ds.startTime}
                            onChange={(v) => setDaySlots((prev) => ({ ...prev, [k]: { ...(prev[k] || {}), startTime: v } }))}
                            isDtao={isDtao}
                            options={timeOptions}
                          />
                        </div>
                        <span className="text-sm">—</span>
                        <div className="w-[120px]">
                          <TimeSelect
                            value={ds.endTime}
                            onChange={(v) => setDaySlots((prev) => ({ ...prev, [k]: { ...(prev[k] || {}), endTime: v } }))}
                            isDtao={isDtao}
                            options={timeOptions}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Profile Info Read-Only */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium ${isDtao ? "text-slate-200" : ""}`}>Coordinator Name</label>
            <input value={bookingName} readOnly className={`mt-2 w-full rounded-md px-3 py-2 border bg-gray-50 ${isDtao ? "bg-transparent/10 text-slate-100" : ""}`} />
          </div>
          <div>
            <label className={`block text-sm font-medium ${isDtao ? "text-slate-200" : ""}`}>Email</label>
            <input value={email} readOnly className={`mt-2 w-full rounded-md px-3 py-2 border bg-gray-50 ${isDtao ? "bg-transparent/10 text-slate-100" : ""}`} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium ${isDtao ? "text-slate-200" : ""}`}>Phone</label>
            <input value={phone} readOnly className={`mt-2 w-full rounded-md px-3 py-2 border bg-gray-50 ${isDtao ? "bg-transparent/10 text-slate-100" : ""}`} />
          </div>
          <div>
            <label className={`block text-sm font-medium ${isDtao ? "text-slate-200" : ""}`}>Department</label>
            <input value={department} readOnly className={`mt-2 w-full rounded-md px-3 py-2 border bg-gray-50 ${isDtao ? "bg-transparent/10 text-slate-100" : ""}`} />
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <AnimatedButton type="button" variant="ghost" className="flex-1" onClick={resetForm}>Clear</AnimatedButton>
          <AnimatedButton type="button" variant="primary" onClick={doCheckAvailability}>Check Availability</AnimatedButton>
        </div>

        <div className="mt-2 text-sm">
          {lastCheckMessage && !lastCheckOk && <span className="text-rose-600">{lastCheckMessage}</span>}
          {lastCheckMessage && lastCheckOk && <span className="text-emerald-700">{lastCheckMessage}</span>}
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!lastCheckOk}
            className={`w-full py-3 rounded-lg font-semibold ${lastCheckOk ? "bg-emerald-600 text-white" : "bg-gray-200 text-slate-500 cursor-not-allowed"}`}
          >
            Submit Request
          </button>
        </div>
      </form>
    </div>
  );
}