// src/components/SeminarCalendar.js
import React from "react";
import AnimatedButton from "./AnimatedButton"; // Adjust path if needed

/* ---------- Helpers & Icons for Calendar ---------- */
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const UsersIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
  </svg>
);

const ymd = (d) => {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

const to12Label = (hhmm) => {
  if (!hhmm) return "";
  const [hh, mm] = hhmm.split(":").map(Number);
  const period = hh >= 12 ? "PM" : "AM";
  const hour12 = ((hh + 11) % 12) + 1;
  return `${String(hour12).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${period}`;
};

const SeminarCalendar = ({
  isDtao,
  calendarMonth,
  setCalendarMonth,
  calendarYear,
  setCalendarYear,
  selectedHall,
  selectedHallObj,
  selectedDateKey,
  getCalendarDayStatus,
  handleCalendarDayClick,
  slotTitle,
  bookingMode,
  date,
  startDate,
  endDate,
  startTime,
  endTime,
  resetForm
}) => {
  
  const now = new Date();

  // --- Grid Calculation ---
  const firstOfMonth = new Date(calendarYear, calendarMonth, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const calendarCells = [];
  for (let i = 0; i < startWeekday; i++) calendarCells.push(null);
  for (let dNum = 1; dNum <= daysInMonth; dNum++) calendarCells.push(dNum);

  return (
    <div className="space-y-6">
      
      {/* 1. Calendar Card */}
      <div className={`${isDtao ? "bg-black/40 border border-violet-900 text-slate-100" : "bg-white"} rounded-lg p-4 shadow-sm`}>
        <div className="flex items-center justify-between mb-4 gap-3">
          <h3 className={`${isDtao ? "text-slate-100" : "text-slate-800"} text-lg font-semibold flex items-center gap-2`}>
            Venue Calendar
          </h3>
          <p className={`${isDtao ? "text-slate-300" : "text-sm text-slate-500"} text-xs md:text-sm`}>
            Choose month & year to see availability.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <select 
            value={calendarMonth} 
            onChange={(e) => setCalendarMonth(Number(e.target.value))} 
            className={`rounded-md px-3 py-2 border text-sm ${isDtao ? "bg-black/40 border-violet-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"}`}
          >
            {MONTH_NAMES.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
          </select>
          <select 
            value={calendarYear} 
            onChange={(e) => setCalendarYear(Number(e.target.value))} 
            className={`rounded-md px-3 py-2 border text-sm ${isDtao ? "bg-black/40 border-violet-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"}`}
          >
            {[-1, 0, 1].map((offset) => { 
              const y = now.getFullYear() + offset; 
              return <option key={y} value={y}>{y}</option>; 
            })}
          </select>
        </div>

        {/* Grid */}
        <div className="mt-2">
          <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-500 mb-2">
            <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarCells.map((cell, idx) => {
              if (cell === null) return <div key={idx} className="h-20 rounded-xl" />;
              
              const dObj = new Date(calendarYear, calendarMonth, cell);
              const key = ymd(dObj);
              const status = getCalendarDayStatus(key, selectedHall);
              const isSelected = key === selectedDateKey;

              let bg = "bg-emerald-50"; 
              let badgeText = "Free"; 
              let badgeDot = "bg-emerald-500";

              if (status === "partial") { bg = "bg-amber-50"; badgeText = "Partial"; badgeDot = "bg-amber-500"; }
              if (status === "full") { bg = "bg-rose-50"; badgeText = "Booked"; badgeDot = "bg-rose-500"; }
              if (status === "none") { bg = isDtao ? "bg-black/40" : "bg-slate-50"; badgeText = "—"; badgeDot = isDtao ? "bg-slate-500" : "bg-slate-400"; }

              const borderClass = isSelected ? "ring-2 ring-blue-500" : "border border-transparent";
              
              return (
                <button 
                  key={idx} 
                  type="button" 
                  onClick={() => handleCalendarDayClick(cell)} 
                  className={`h-20 rounded-xl flex flex-col items-start justify-between px-2 py-2 text-left text-xs ${bg} ${borderClass} transition hover:shadow-sm`}
                >
                  <span className={`${isDtao ? "text-slate-900" : "text-slate-900"} text-sm font-semibold`}>{cell}</span>
                  <div className="flex items-center gap-1 text-[11px] mt-auto">
                    <span className={`w-2 h-2 rounded-full ${badgeDot}`} />
                    <span className={`${isDtao ? "text-slate-800" : "text-slate-700"}`}>{badgeText}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Selection Card */}
      <div className={`${isDtao ? "bg-black/40 border border-violet-900 text-slate-100" : "bg-white"} rounded-lg p-4 shadow-sm`}>
        <h4 className={`${isDtao ? "text-slate-100" : "text-lg font-semibold text-slate-800"} text-lg font-semibold`}>Selection</h4>
        <div className={`text-sm ${isDtao ? "text-slate-300" : "text-slate-600"} space-y-2`}>
          <div><span className={`${isDtao ? "text-violet-300" : "text-indigo-600"}`}>Hall:</span> {selectedHallObj?.name || selectedHall || "Not selected"}</div>
          <div><span className={`${isDtao ? "text-violet-300" : "text-indigo-600"}`}>Event:</span> {slotTitle || "Not specified"}</div>
          <div><span className={`${isDtao ? "text-violet-300" : "text-indigo-600"}`}>Date:</span> {bookingMode === "time" ? ymd(date) : `${ymd(startDate)} → ${ymd(endDate)}`}</div>
          <div><span className={`${isDtao ? "text-violet-300" : "text-indigo-600"}`}>Time:</span> {bookingMode === "time" ? `${to12Label(startTime)} — ${to12Label(endTime)}` : "Per-day times / full-day"}</div>
          <div className="flex items-center gap-2 text-xs pt-1">
             <UsersIcon className={`h-4 w-4 ${isDtao ? "text-slate-300" : "text-slate-400"}`} />
             <span>Capacity: {selectedHallObj?.capacity ?? "—"}</span>
          </div>
        </div>
        <div className="mt-4">
          <AnimatedButton onClick={resetForm} variant="ghost" className={`${isDtao ? "w-full py-2 rounded bg-transparent border border-violet-700 text-slate-200" : "w-full py-2 rounded bg-gray-100"}`}>Clear</AnimatedButton>
        </div>
      </div>

    </div>
  );
};

export default SeminarCalendar;