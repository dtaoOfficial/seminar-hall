import React, { useEffect, useRef, useState } from "react";
import AnimatedButton from "../../components/AnimatedButton";

/* --- INTERNAL TIME OPTIONS (6 AM - 11 PM) --- */
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
        className={`w-full text-left rounded-xl px-3 py-2.5 border flex items-center justify-between transition-all ${
          isDtao 
            ? "bg-white/5 border-white/10 text-slate-100 hover:bg-white/10" 
            : "bg-white border-gray-200 text-slate-700 hover:border-blue-400"
        }`}
      >
        <span>{to12LabelInternal(value)}</span>
        <svg className={`w-4 h-4 ml-2 ${isDtao ? "text-slate-400" : "text-slate-400"}`} viewBox="0 0 24 24" fill="none">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          tabIndex={-1}
          className={`absolute z-50 mt-1 w-full rounded-xl shadow-xl border overflow-hidden ${
            isDtao ? "bg-[#1a1025] border-violet-900 text-slate-100" : "bg-white border-gray-100"
          }`}
          style={{ maxHeight: `${6 * 40}px`, overflowY: "auto" }}
        >
          {options.map((opt) => (
            <div
              key={opt}
              role="option"
              data-val={opt}
              aria-selected={opt === value}
              tabIndex={0}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`px-3 py-2 cursor-pointer text-sm ${
                isDtao ? "hover:bg-violet-900/60" : "hover:bg-blue-50"
              } ${
                opt === value ? (isDtao ? "bg-violet-800 font-semibold" : "bg-blue-100 font-semibold text-blue-700") : ""
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

/* --- Main Form Component --- */
export default function AdminBookingForm({
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
  setBookingName,
  email,
  setEmail,
  phone,
  setPhone,
  department,
  setDepartment,
  departmentExtra,
  setDepartmentExtra,
  departments,
  resetForm,
  doCheckAvailability,
  handleSubmit,
  lastCheckOk,
  lastCheckMessage,
  setLastCheckOk,
  setLastCheckMessage,
  loading,
  ymd,
  listDatesBetween
}) {
  
  const timeOptions = INTERNAL_TIME_OPTIONS;

  return (
    <div className={`rounded-3xl p-8 shadow-sm border ${isDtao ? "bg-black/40 border-violet-900/50" : "bg-white border-white"}`}>
      
      {/* 1. Venue & Toggle Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <div className="w-full sm:w-1/2">
            <label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 block ${isDtao ? "text-slate-400" : "text-slate-500"}`}>
                Select Venue
            </label>
            <select
                value={selectedHall || ""}
                onChange={(e) => {
                    setSelectedHall(e.target.value);
                    setLastCheckOk(false);
                    setLastCheckMessage("");
                }}
                disabled={loading}
                className={`w-full rounded-xl px-4 py-2.5 border text-sm font-medium outline-none transition-all ${
                    isDtao ? "bg-white/5 border-white/10 text-white focus:border-violet-500" : "bg-slate-50 border-gray-200 text-slate-800 focus:border-blue-500"
                } ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
            >
                {loading && <option value="">Loading...</option>}
                {!loading && halls.length === 0 && <option value="">No halls available</option>}
                {!loading && halls.map((h) => (
                    <option key={h._id || h.id} value={h.name || h.hallName}>{h.name || h.hallName}</option>
                ))}
            </select>
        </div>

        <div className={`flex p-1 rounded-xl w-full sm:w-auto ${isDtao ? "bg-white/5" : "bg-slate-100"}`}>
            <button 
                type="button"
                onClick={() => { setBookingMode("time"); setLastCheckOk(false); setLastCheckMessage(""); }} 
                className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${bookingMode === "time" ? "bg-blue-600 text-white shadow-md" : "opacity-60 hover:opacity-100"}`}
            >
                Time Wise
            </button>
            <button 
                type="button"
                onClick={() => { setBookingMode("day"); setLastCheckOk(false); setLastCheckMessage(""); }} 
                className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${bookingMode === "day" ? "bg-blue-600 text-white shadow-md" : "opacity-60 hover:opacity-100"}`}
            >
                Day Wise
            </button>
        </div>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        
        {/* 2. Event Name */}
        <div>
          <label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 block ${isDtao ? "text-slate-400" : "text-slate-500"}`}>Event Name</label>
          <input
            value={slotTitle}
            onChange={(e) => setSlotTitle(e.target.value)}
            className={`w-full rounded-xl px-4 py-2.5 border text-sm outline-none transition-all ${
                isDtao ? "bg-white/5 border-white/10 text-white focus:border-violet-500" : "bg-slate-50 border-gray-200 text-slate-900 focus:border-blue-500"
            }`}
            placeholder="e.g. AI Symposium 2026"
          />
        </div>

        {/* 3. Date & Time Selection (Clean Grid Layout) */}
        <div className={`p-5 rounded-2xl border ${isDtao ? "bg-white/5 border-white/5" : "bg-slate-50/50 border-slate-100"}`}>
            {bookingMode === "time" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 block ${isDtao ? "text-slate-400" : "text-slate-500"}`}>
                            <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3"/> Date</span>
                        </label>
                        <input
                            type="date"
                            value={ymd(date)}
                            onChange={(e) => { setDate(new Date(e.target.value)); setLastCheckOk(false); setLastCheckMessage(""); }}
                            className={`w-full rounded-xl px-3 py-2.5 border text-sm outline-none ${isDtao ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200"}`}
                        />
                    </div>
                    <div>
                        <label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 block ${isDtao ? "text-slate-400" : "text-slate-500"}`}>
                            <span className="flex items-center gap-1"><ClockIcon className="w-3 h-3"/> Start</span>
                        </label>
                        <TimeSelect value={startTime} onChange={(v) => { setStartTime(v); setLastCheckOk(false); setLastCheckMessage(""); }} isDtao={isDtao} options={timeOptions} />
                    </div>
                    <div>
                        <label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 block ${isDtao ? "text-slate-400" : "text-slate-500"}`}>
                            <span className="flex items-center gap-1"><ClockIcon className="w-3 h-3"/> End</span>
                        </label>
                        <TimeSelect value={endTime} onChange={(v) => { setEndTime(v); setLastCheckOk(false); setLastCheckMessage(""); }} isDtao={isDtao} options={timeOptions} />
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 block ${isDtao ? "text-slate-400" : "text-slate-500"}`}>Start Date</label>
                            <input
                                type="date"
                                value={ymd(startDate)}
                                onChange={(e) => { setStartDate(new Date(e.target.value)); setLastCheckOk(false); setLastCheckMessage(""); }}
                                className={`w-full rounded-xl px-3 py-2.5 border text-sm outline-none ${isDtao ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200"}`}
                            />
                        </div>
                        <div>
                            <label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 block ${isDtao ? "text-slate-400" : "text-slate-500"}`}>End Date</label>
                            <input
                                type="date"
                                value={ymd(endDate)}
                                onChange={(e) => { setEndDate(new Date(e.target.value)); setLastCheckOk(false); setLastCheckMessage(""); }}
                                className={`w-full rounded-xl px-3 py-2.5 border text-sm outline-none ${isDtao ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200"}`}
                            />
                        </div>
                    </div>
                    
                    <div className="text-xs opacity-60 mb-2">Optional: Add specific times for days. Default is Full Day.</div>
                    
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {listDatesBetween(startDate, endDate).map((d) => {
                            const k = ymd(d);
                            const ds = daySlots[k] || { startTime: timeOptions[12], endTime: timeOptions[16] };
                            const isActive = !!daySlots[k];
                            
                            return (
                                <div key={k} className={`flex items-center gap-3 p-2 rounded-lg border text-sm ${isDtao ? "bg-white/5 border-white/5" : "bg-white border-gray-100"}`}>
                                    <div className="w-24 font-bold opacity-80">{k}</div>
                                    <div className="flex-1 text-xs opacity-50 italic">
                                        {isActive ? "Custom Hours Set" : "Full Day Booking"}
                                    </div>
                                    {isActive ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-20"><TimeSelect value={ds.startTime} onChange={v => setDaySlots(p => ({...p, [k]: {...ds, startTime: v}}))} isDtao={isDtao} options={timeOptions} /></div>
                                            <span className="opacity-50">-</span>
                                            <div className="w-20"><TimeSelect value={ds.endTime} onChange={v => setDaySlots(p => ({...p, [k]: {...ds, endTime: v}}))} isDtao={isDtao} options={timeOptions} /></div>
                                            <button onClick={() => setDaySlots(p => { const n={...p}; delete n[k]; return n; })} className="text-red-500 hover:bg-red-500/10 p-1 rounded">✕</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setDaySlots(p => ({...p, [k]: {startTime: timeOptions[12], endTime: timeOptions[16]}}))} className="text-blue-500 text-xs font-bold hover:underline">
                                            + Set Time
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>

        {/* 4. User Details - 2 Col Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 block ${isDtao ? "text-slate-400" : "text-slate-500"}`}>Coordinator</label>
                <input value={bookingName} onChange={(e) => setBookingName(e.target.value)} className={`w-full rounded-xl px-4 py-2.5 border text-sm outline-none ${isDtao ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-gray-200"}`} />
            </div>
            <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 block ${isDtao ? "text-slate-400" : "text-slate-500"}`}>Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className={`w-full rounded-xl px-4 py-2.5 border text-sm outline-none ${isDtao ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-gray-200"}`} />
            </div>
            <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 block ${isDtao ? "text-slate-400" : "text-slate-500"}`}>Phone</label>
                <input value={phone} onChange={(e) => {const d = e.target.value.replace(/\D/g, "").slice(0, 10); setPhone(d);}} maxLength={10} className={`w-full rounded-xl px-4 py-2.5 border text-sm outline-none ${isDtao ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-gray-200"}`} />
            </div>
            <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 block ${isDtao ? "text-slate-400" : "text-slate-500"}`}>Department</label>
                <select value={department} onChange={(e) => setDepartment(e.target.value)} className={`w-full rounded-xl px-4 py-2.5 border text-sm outline-none ${isDtao ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-gray-200"}`}>
                    <option value="">Select Dept</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>
        </div>
        
        {/* Extra Info */}
        <div>
            <label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 block ${isDtao ? "text-slate-400" : "text-slate-500"}`}>Specific Info (Optional)</label>
            <input value={departmentExtra} onChange={(e) => setDepartmentExtra(e.target.value)} className={`w-full rounded-xl px-4 py-2.5 border text-sm outline-none ${isDtao ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-gray-200"}`} placeholder="e.g. ZPHS School" />
        </div>

        {/* 5. Actions */}
        <div className="flex gap-4 pt-2">
          <AnimatedButton type="button" onClick={doCheckAvailability} variant="primary" className="flex-1 py-3">
            Check Availability
          </AnimatedButton>
          <AnimatedButton 
            type="button" 
            onClick={handleSubmit} 
            variant={lastCheckOk ? "primary" : "ghost"} 
            className={`flex-1 py-3 ${!lastCheckOk ? "opacity-50 pointer-events-none" : "bg-emerald-600 text-white border-emerald-600"}`}
          >
            Confirm Booking
          </AnimatedButton>
        </div>

        {/* Status Message */}
        <div className="text-center h-5">
          {lastCheckMessage && !lastCheckOk && <span className="text-rose-500 text-sm font-medium">{lastCheckMessage}</span>}
          {lastCheckMessage && lastCheckOk && <span className="text-emerald-600 text-sm font-bold">{lastCheckMessage}</span>}
        </div>

      </form>
    </div>
  );
}