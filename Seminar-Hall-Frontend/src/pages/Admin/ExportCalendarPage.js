// src/pages/Admin/ExportCalendarPage.js
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useReactToPrint } from "react-to-print";
import api from "../../utils/api";
import { useTheme } from "../../contexts/ThemeContext";

const ExportCalendarPage = () => {
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  // Data State
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selectedHall, setSelectedHall] = useState("");
  const [halls, setHalls] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  // Customization State
  const [rowHeight, setRowHeight] = useState(130);
  const [fontScale, setFontScale] = useState(1);
  const [isAutoFit, setIsAutoFit] = useState(true);

  const componentRef = useRef(null);

  // Helper: Calculate Duration
  const getDuration = (start, end) => {
    if (!start || !end) return "";
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const totalStart = sh * 60 + sm;
    const totalEnd = eh * 60 + em;
    const diff = (totalEnd - totalStart) / 60;
    return diff > 0 ? `${Number(diff.toFixed(1))}h` : "";
  };

  // Helper: Smart Abbreviation for Departments
  const getDeptLabel = (deptName) => {
    if (!deptName) return "GEN";
    // If short enough, return as is
    if (deptName.length <= 20) return deptName.toUpperCase();
    
    // Otherwise, create acronym (e.g. Artificial Intelligence -> AI)
    return deptName
      .split(/[\s-]+/) // split by space or hyphen
      .map(word => word.charAt(0))
      .join("")
      .toUpperCase();
  };

  // Load Halls
  useEffect(() => {
    api.get("/halls").then((res) => {
      const list = Array.isArray(res.data) ? res.data : [];
      setHalls(list);
      if (list.length > 0) setSelectedHall(list[0].hallName || list[0].name);
    });
  }, []);

  // Fetch Bookings
  useEffect(() => {
    if (!selectedHall) return;
    setLoading(true);
    api.get("/seminars").then((res) => {
      const all = Array.isArray(res.data) ? res.data : [];
      const filtered = all.filter((s) => {
        if (!s.date) return false;
        const d = new Date(s.date);
        return (
          d.getMonth() === month &&
          d.getFullYear() === year &&
          s.hallName === selectedHall &&
          s.status === "APPROVED"
        );
      });
      // Sort: Earliest time first
      filtered.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return (a.startTime || "").localeCompare(b.startTime || "");
      });
      setBookings(filtered);
      setLoading(false);
    });
  }, [year, month, selectedHall]);

  // Calendar Math
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const totalSlots = [...blanks, ...days];
  const totalWeeks = Math.ceil(totalSlots.length / 7);

  // Auto-Fit Logic
  useEffect(() => {
    if (isAutoFit) {
      const availableHeightPx = 600; 
      const calculatedHeight = Math.floor(availableHeightPx / totalWeeks);
      setRowHeight(calculatedHeight);
    }
  }, [isAutoFit, totalWeeks]);

  // Overflow Logic
  const overflowBookings = useMemo(() => {
    let hidden = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayBookings = bookings.filter(
        (b) => new Date(b.date).getDate() === d
      );
      if (dayBookings.length > 2) {
        hidden.push(...dayBookings.slice(2));
      }
    }
    return hidden;
  }, [bookings, daysInMonth]);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Calendar_${selectedHall}_${month + 1}_${year}`,
  });

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return (
    <div className={`min-h-screen pt-24 pb-12 ${isDtao ? "text-slate-100" : "text-slate-900"}`}>
      <div className="max-w-[1300px] mx-auto px-4 space-y-6">
        
        {/* --- CONTROLS PANEL --- */}
        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 no-print flex flex-col gap-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-bold uppercase opacity-50 mb-1">Venue</label>
              <select
                value={selectedHall}
                onChange={(e) => setSelectedHall(e.target.value)}
                className="px-3 py-2 rounded-lg bg-black/20 border border-white/10 outline-none min-w-[200px]"
              >
                {halls.map((h) => (
                  <option key={h.id} value={h.hallName || h.name}>
                    {h.hallName || h.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase opacity-50 mb-1">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="px-3 py-2 rounded-lg bg-black/20 border border-white/10 outline-none"
              >
                {months.map((m, i) => (
                  <option key={m} value={i}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase opacity-50 mb-1">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="px-3 py-2 rounded-lg bg-black/20 border border-white/10 outline-none w-24"
              />
            </div>
            
            <button
              onClick={() => handlePrint()}
              disabled={loading}
              className="px-6 py-2 rounded-lg bg-blue-600 text-white font-bold text-sm shadow-lg hover:bg-blue-500 transition-colors ml-auto"
            >
              {loading ? "Loading..." : "🖨️ Print / Save PDF"}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="autoFit" 
                checked={isAutoFit} 
                onChange={(e) => setIsAutoFit(e.target.checked)}
                className="w-4 h-4 accent-blue-500"
              />
              <label htmlFor="autoFit" className="text-sm font-bold cursor-pointer">Auto-Fit Page Height</label>
            </div>

            {!isAutoFit && (
              <div className="flex items-center gap-3 bg-black/10 px-3 py-1 rounded-lg">
                <span className="text-xs font-bold uppercase opacity-70">Row Height:</span>
                <input
                  type="range"
                  min="80"
                  max="250"
                  value={rowHeight}
                  onChange={(e) => setRowHeight(Number(e.target.value))}
                  className="w-32 accent-blue-500 cursor-pointer"
                />
                <span className="text-xs font-mono w-8">{rowHeight}</span>
              </div>
            )}

            <div className="flex items-center gap-3 bg-black/10 px-3 py-1 rounded-lg">
              <span className="text-xs font-bold uppercase opacity-70">Font Size:</span>
              <input
                type="range"
                min="0.7"
                max="1.3"
                step="0.1"
                value={fontScale}
                onChange={(e) => setFontScale(Number(e.target.value))}
                className="w-32 accent-purple-500 cursor-pointer"
              />
              <span className="text-xs font-mono w-8">{Math.round(fontScale * 100)}%</span>
            </div>
          </div>
        </div>

        {/* --- PRINTABLE PREVIEW --- */}
        <div className="overflow-auto flex justify-center bg-gray-500/10 p-4 sm:p-8 rounded-3xl border shadow-inner">
          <div
            ref={componentRef}
            className="bg-white text-black shadow-2xl print-container flex flex-col"
            style={{ 
              width: "297mm", 
              height: "208mm",
              fontFamily: "Arial, sans-serif",
              overflow: "hidden" 
            }}
          >
            {/* Header */}
            <div className="text-center pt-3 pb-1 border-b-2 border-black flex-none">
              <h1 className="text-2xl font-black uppercase tracking-widest leading-none mb-1">
                {selectedHall}
              </h1>
              <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">
                {months[month]} {year}
              </h2>
            </div>

            {/* Weekday Header */}
            <div className="grid grid-cols-7 border-b border-black bg-gray-200 flex-none text-[10px]">
              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
                <div key={d} className="py-1 text-center font-bold border-r border-black last:border-r-0">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div 
              className="grid grid-cols-7 border-black flex-grow"
              style={{
                gridTemplateRows: isAutoFit 
                  ? `repeat(${totalWeeks}, 1fr)` 
                  : `repeat(${totalWeeks}, ${rowHeight}px)`
              }}
            >
              {totalSlots.map((day, idx) => {
                const isRightEdge = (idx + 1) % 7 === 0;
                const borderClass = `border-b border-black ${isRightEdge ? '' : 'border-r'}`;

                if (!day) return <div key={idx} className={`bg-gray-50/30 ${borderClass}`}></div>;

                const dayBookings = bookings.filter((b) => {
                  const d = new Date(b.date);
                  return d.getDate() === day;
                });

                const displayBookings = dayBookings.slice(0, 2);

                return (
                  <div key={idx} className={`relative p-1 flex flex-col ${borderClass} h-full`}>
                    <span className="absolute top-0.5 right-1 text-[10px] font-bold text-gray-400 z-10">
                      {day}
                    </span>

                    <div className="mt-3 flex-1 flex flex-col gap-1 w-full overflow-hidden">
                      {displayBookings.map((b) => {
                        const duration = getDuration(b.startTime, b.endTime);
                        // Get smart department label
                        const deptLabel = getDeptLabel(b.department);

                        return (
                          <div
                            key={b.id || Math.random()}
                            className="flex-1 min-h-0 border-l-[3px] border-blue-600 pl-1.5 bg-blue-50/60 rounded-r flex flex-col justify-center py-0.5"
                            style={{ fontSize: `${10 * fontScale}px`, lineHeight: 1.15 }}
                          >
                            {/* Row 1: Time + Duration */}
                            <div className="flex items-center gap-1 border-b border-blue-100 pb-[1px] mb-[1px]">
                              <span className="font-bold bg-white/80 px-1 rounded border border-gray-200 text-[0.85em]">
                                {b.startTime}-{b.endTime}
                              </span>
                              {duration && (
                                <span className="font-bold text-[0.85em] text-blue-700">
                                  ({duration})
                                </span>
                              )}
                            </div>

                            {/* Row 2: Event Name */}
                            <div className="font-bold text-blue-900 truncate leading-tight">
                              {b.slotTitle || "Event"}
                            </div>

                            {/* Row 3: Hall Name */}
                            <div className="text-[0.85em] font-semibold text-gray-600 truncate uppercase">
                              {b.hallName}
                            </div>

                            {/* Row 4: Candidate Name */}
                            <div className="truncate font-medium text-gray-800 text-[0.9em]">
                              {b.bookingName}
                            </div>

                            {/* Row 5: Footer (Phone + Dept) - Optimized */}
                            <div className="flex justify-between items-center text-[0.85em] text-gray-600 font-mono mt-[1px] border-t border-gray-100 pt-[1px]">
                              <span className="truncate flex-1 tracking-tight">
                                {b.phone}
                              </span>
                              <span className="uppercase font-bold text-gray-500 text-[0.9em] ml-1 bg-gray-100 px-1 rounded whitespace-nowrap">
                                {deptLabel}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Overflow Table (Separate Page) */}
        {overflowBookings.length > 0 && (
          <div className="bg-white text-black p-8 max-w-[297mm] mx-auto shadow-lg mt-8 hidden print:block page-break-before-always">
            <h3 className="text-lg font-black uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="bg-red-600 text-white px-3 py-1 rounded text-sm">Overflow Bookings</span>
              <span>{months[month]} {year}</span>
            </h3>
            <table className="w-full text-left text-xs border-collapse border border-black">
              <thead className="bg-gray-200">
                <tr>
                  <th className="py-2 px-3 border border-black font-bold uppercase w-20">Date</th>
                  <th className="py-2 px-3 border border-black font-bold uppercase w-24">Time (Dur)</th>
                  <th className="py-2 px-3 border border-black font-bold uppercase">Event</th>
                  <th className="py-2 px-3 border border-black font-bold uppercase">Hall</th>
                  <th className="py-2 px-3 border border-black font-bold uppercase">Coordinator</th>
                  <th className="py-2 px-3 border border-black font-bold uppercase w-20">Dept</th>
                  <th className="py-2 px-3 border border-black font-bold uppercase w-28">Phone</th>
                </tr>
              </thead>
              <tbody>
                {overflowBookings.map((b) => (
                  <tr key={b.id || Math.random()}>
                    <td className="py-2 px-3 border border-black font-mono font-bold text-blue-700">
                      {new Date(b.date).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-3 border border-black font-mono">
                      {b.startTime} - {b.endTime} <br/>
                      <span className="font-bold text-xs text-gray-500">
                        ({getDuration(b.startTime, b.endTime)})
                      </span>
                    </td>
                    <td className="py-2 px-3 border border-black font-bold">{b.slotTitle}</td>
                    <td className="py-2 px-3 border border-black font-semibold text-gray-700">{b.hallName}</td>
                    <td className="py-2 px-3 border border-black">{b.bookingName}</td>
                    <td className="py-2 px-3 border border-black uppercase text-[10px] font-bold">
                      {getDeptLabel(b.department)}
                    </td>
                    <td className="py-2 px-3 border border-black font-mono">{b.phone || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0; 
          }
          body {
            -webkit-print-color-adjust: exact;
            background: white;
            margin: 0;
            padding: 0;
          }
          .no-print { display: none !important; }
          
          .print-container {
            width: 297mm !important;
            height: 209mm !important;
            margin: 0 !important;
            padding: 5mm !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            page-break-after: avoid; 
            page-break-inside: avoid;
          }

          .page-break-before-always {
            page-break-before: always;
            margin-top: 10mm !important;
            width: 297mm !important;
            padding: 10mm !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ExportCalendarPage;