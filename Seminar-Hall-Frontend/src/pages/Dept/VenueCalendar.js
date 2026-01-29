import React from "react";

const UsersIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
  </svg>
);

export default function VenueCalendar({
  isDtao,
  calendarMonth,
  setCalendarMonth,
  calendarYear,
  setCalendarYear,
  MONTH_NAMES,
  calendarCells,
  getCalendarDayStatus,
  selectedHall,
  selectedDateKey,
  handleCalendarDayClick,
  selectedHallObj,
  slotTitle,
  bookingMode,
  date,
  startDate,
  endDate,
  startTime,
  endTime,
  ymd,
  to12Label
}) {
  const now = new Date();

  return (
    <div className="space-y-6">
      <div className={`${isDtao ? "bg-black/40 border border-violet-900 text-slate-100" : "bg-white"} rounded-lg p-4 shadow-sm`}>
        <div className="flex items-center justify-between mb-4 gap-3">
          <h3 className={`${isDtao ? "text-slate-100" : "text-slate-800"} text-lg font-semibold flex items-center gap-2`}>
            <span role="img" aria-label="calendar">📅</span> Venue Calendar
          </h3>
        </div>

        <p className={`${isDtao ? "text-slate-300" : "text-slate-500"} text-xs sm:text-sm mb-3`}>
          Choose month &amp; year to see which days are free for the selected venue.
        </p>

        <div className="flex flex-wrap gap-3 mb-4">
          <select
            value={calendarMonth}
            onChange={(e) => setCalendarMonth(Number(e.target.value))}
            className={`rounded-md px-3 py-2 border text-sm ${isDtao ? "bg-black/40 border-violet-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"}`}
          >
            {MONTH_NAMES.map((m, idx) => (
              <option key={m} value={idx}>{m}</option>
            ))}
          </select>

          <select
            value={calendarYear}
            onChange={(e) => setCalendarYear(Number(e.target.value))}
            className={`rounded-md px-3 py-2 border text-sm ${isDtao ? "bg-black/40 border-violet-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"}`}
          >
            {[-1, 0, 1].map((off) => {
              const y = now.getFullYear() + off;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
        </div>

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

            if (status === "partial") {
              bg = "bg-amber-50";
              badgeText = "Partial";
              badgeDot = "bg-amber-500";
            } else if (status === "full") {
              bg = "bg-rose-50";
              badgeText = "Booked";
              badgeDot = "bg-rose-500";
            }

            const borderClass = isSelected ? "ring-2 ring-blue-500" : "border border-transparent";

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleCalendarDayClick(cell)}
                className={`h-20 rounded-xl flex flex-col items-start justify-between px-2 py-2 text-left text-xs ${bg} ${borderClass} transition hover:shadow-sm`}
              >
                <span className="text-sm font-semibold">{cell}</span>
                <div className="flex items-center gap-1 text-[11px] mt-auto">
                  <span className={`w-2 h-2 rounded-full ${badgeDot}`} />
                  <span className="text-slate-700">{badgeText}</span>
                </div>
              </button>
            );
          })}
        </div>
        <div className={`${isDtao ? "text-slate-300" : "text-slate-500"} text-xs mt-3`}>
          Tip: Click a date to view bookings on that day.
        </div>
      </div>

      {/* Selection Summary */}
      <div className={`${isDtao ? "bg-black/40 border border-violet-900 text-slate-100" : "bg-white"} rounded-lg p-4 shadow-sm`}>
        <h4 className={`${isDtao ? "text-slate-100" : "text-lg font-semibold text-slate-800"} text-lg font-semibold`}>
          Your Selection
        </h4>
        <div className={`text-sm ${isDtao ? "text-slate-300" : "text-slate-600"} space-y-2`}>
          <div>
            <span className={`${isDtao ? "text-violet-300" : "text-indigo-600"}`}>Hall:</span>{" "}
            {selectedHallObj?.name || selectedHall || "Not selected"}
          </div>
          <div>
            <span className={`${isDtao ? "text-violet-300" : "text-indigo-600"}`}>Event:</span>{" "}
            {slotTitle || "Not specified"}
          </div>
          <div>
            <span className={`${isDtao ? "text-violet-300" : "text-indigo-600"}`}>Date:</span>{" "}
            {bookingMode === "time" ? ymd(date) : `${ymd(startDate)} → ${ymd(endDate)}`}
          </div>
          <div>
            <span className={`${isDtao ? "text-violet-300" : "text-indigo-600"}`}>Time:</span>{" "}
            {bookingMode === "time" ? `${to12Label(startTime)} — ${to12Label(endTime)}` : "Per-day times / full-day"}
          </div>
          <div className="flex items-center gap-2 text-xs pt-1">
            <UsersIcon className={`h-4 w-4 ${isDtao ? "text-slate-300" : "text-slate-400"}`} />
            <span>Capacity: {selectedHallObj?.capacity ?? "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}