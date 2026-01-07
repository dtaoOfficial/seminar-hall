import React, { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import api from "../../utils/api";
import { useTheme } from "../../contexts/ThemeContext";

const ExportCalendarPage = () => {
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  // State
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedHall, setSelectedHall] = useState("");
  const [halls, setHalls] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ 1. Create the Ref
  const componentRef = useRef(null);

  // Load Halls
  useEffect(() => {
    api.get("/halls").then((res) => {
      const list = Array.isArray(res.data) ? res.data : [];
      setHalls(list);
      if (list.length > 0) setSelectedHall(list[0].hallName || list[0].name);
    });
  }, []);

  // Fetch Bookings when filters change
  useEffect(() => {
    if (!selectedHall) return;
    setLoading(true);
    api.get("/seminars").then((res) => {
      const all = Array.isArray(res.data) ? res.data : [];
      const filtered = all.filter((s) => {
        if (!s.date) return false;
        const d = new Date(s.date);
        const matchesMonth = d.getMonth() === month && d.getFullYear() === year;
        const matchesHall = s.hallName === selectedHall;
        const isApproved = s.status === "APPROVED"; 
        return matchesMonth && matchesHall && isApproved;
      });
      setBookings(filtered);
      setLoading(false);
    });
  }, [year, month, selectedHall]);

  // Calendar Logic
  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const totalSlots = [...blanks, ...days];

  // ✅ 2. FIXED: Use 'contentRef' instead of 'content' for newer versions
  const handlePrint = useReactToPrint({
    contentRef: componentRef, // Fix: Use contentRef directly
    documentTitle: `Calendar_${selectedHall}_${month+1}_${year}`,
  });

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className={`min-h-screen pt-24 pb-12 ${isDtao ? "text-slate-100" : "text-slate-900"}`}>
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        
        {/* Controls (Hidden when printing) */}
        <div className="flex flex-col md:flex-row gap-4 items-end bg-white/5 p-6 rounded-2xl border border-white/10 no-print">
          <div>
            <label className="block text-xs font-bold uppercase opacity-50 mb-1">Venue</label>
            <select 
              value={selectedHall} 
              onChange={(e) => setSelectedHall(e.target.value)}
              className="px-4 py-2 rounded-xl bg-black/20 border border-white/10 outline-none min-w-[200px]"
            >
              {halls.map(h => <option key={h.id} value={h.hallName || h.name}>{h.hallName || h.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase opacity-50 mb-1">Month</label>
            <select 
              value={month} 
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-4 py-2 rounded-xl bg-black/20 border border-white/10 outline-none"
            >
              {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase opacity-50 mb-1">Year</label>
            <input 
              type="number" 
              value={year} 
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-4 py-2 rounded-xl bg-black/20 border border-white/10 outline-none w-24"
            />
          </div>
          {/* ✅ 3. Ensure onClick calls the new handlePrint */}
          <button 
            onClick={() => handlePrint()}
            className="px-6 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-lg hover:bg-blue-500 transition-colors ml-auto"
          >
            Download PDF
          </button>
        </div>

        {/* Printable Area */}
        <div className="overflow-auto flex justify-center bg-gray-100 p-8 rounded-3xl border shadow-inner">
          <div 
            ref={componentRef} // ✅ 4. Ref attached here
            className="bg-white text-black p-8 w-[297mm] min-h-[210mm] shadow-2xl origin-top print-container" 
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {/* Calendar Header */}
            <div className="text-center mb-6 border-b-2 border-black pb-4">
              <h1 className="text-3xl font-black uppercase tracking-widest">{selectedHall}</h1>
              <h2 className="text-xl font-bold text-gray-600 mt-1">{months[month]} {year}</h2>
            </div>

            {/* Grid Header */}
            <div className="grid grid-cols-7 border-t border-l border-black bg-gray-100">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                <div key={d} className="p-2 text-center font-bold uppercase text-xs border-r border-b border-black">
                  {d}
                </div>
              ))}
            </div>

            {/* Grid Body */}
            <div className="grid grid-cols-7 border-l border-black">
              {totalSlots.map((day, idx) => {
                if (!day) return <div key={idx} className="h-36 bg-gray-50 border-r border-b border-black"></div>;

                // Find bookings for this day
                const dayBookings = bookings.filter(b => {
                   const d = new Date(b.date);
                   return d.getDate() === day;
                });

                return (
                  <div key={idx} className="h-36 border-r border-b border-black p-1 relative overflow-hidden flex flex-col">
                    {/* Date Number */}
                    <span className="text-sm font-bold absolute top-1 right-2 text-gray-400">{day}</span>
                    
                    {/* Bookings List */}
                    <div className="mt-5 space-y-1 flex-1 overflow-hidden">
                      {dayBookings.map(b => (
                        <div key={b.id} className="leading-tight border-l-2 border-blue-500 pl-1 mb-1">
                          {/* 1. Name */}
                          <div className="font-bold truncate text-[9px]">{b.bookingName || b.slotTitle}</div>
                          
                          {/* 2. Department (Added) */}
                          <div className="text-[8px] uppercase tracking-wider font-bold text-gray-500 truncate">
                            {b.department || "GEN"}
                          </div>

                          {/* 3. Time */}
                          <div className="text-[8px] text-gray-700 font-mono">
                            {b.startTime}-{b.endTime}
                          </div>

                          {/* 4. Phone */}
                          {b.phone && <div className="text-[8px] text-gray-500">{b.phone}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-4 text-[10px] text-gray-400 flex justify-between">
              <span>Generated on {new Date().toLocaleDateString()}</span>
              <span>NHCE Seminar Booking System</span>
            </div>
          </div>
        </div>

      </div>

      {/* CSS for Printing */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 5mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            background: white;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            width: 100% !important;
            height: 100% !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ExportCalendarPage;