// src/pages/Admin/ExportCalendarPage.js
import React, { useState, useEffect, useRef, useMemo } from "react";
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

  const componentRef = useRef(null);

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
        const matchesMonth = d.getMonth() === month && d.getFullYear() === year;
        const matchesHall = s.hallName === selectedHall;
        const isApproved = s.status === "APPROVED"; 
        return matchesMonth && matchesHall && isApproved;
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
  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const totalSlots = [...blanks, ...days];

  // Overflow Logic
  const overflowBookings = useMemo(() => {
    let hidden = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayBookings = bookings.filter(b => new Date(b.date).getDate() === d);
      if (dayBookings.length > 2) {
        hidden.push(...dayBookings.slice(2)); 
      }
    }
    return hidden;
  }, [bookings, daysInMonth]);

  // Print Handler
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Calendar_${selectedHall}_${month+1}_${year}`,
  });

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className={`min-h-screen pt-24 pb-12 ${isDtao ? "text-slate-100" : "text-slate-900"}`}>
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        
        {/* Controls */}
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
            ref={componentRef} 
            className="bg-white text-black p-8 w-[297mm] min-h-[210mm] shadow-2xl origin-top print-container" 
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {/* Header */}
            <div className="text-center mb-6 border-b-2 border-black pb-4">
              <h1 className="text-3xl font-black uppercase tracking-widest">{selectedHall}</h1>
              <h2 className="text-xl font-bold text-gray-600 mt-1">{months[month]} {year}</h2>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 border-t border-l border-black bg-gray-100">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                <div key={d} className="p-2 text-center font-bold uppercase text-xs border-r border-b border-black">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 border-l border-black mb-4">
              {totalSlots.map((day, idx) => {
                if (!day) return <div key={idx} className="h-32 bg-gray-50 border-r border-b border-black"></div>;

                const dayBookings = bookings.filter(b => {
                   const d = new Date(b.date);
                   return d.getDate() === day;
                });

                const displayBookings = dayBookings.slice(0, 2);
                const remaining = dayBookings.length - 2;

                return (
                  <div key={idx} className="h-32 border-r border-b border-black p-1 relative overflow-hidden flex flex-col">
                    <span className="text-sm font-bold absolute top-1 right-2 text-gray-400">{day}</span>
                    
                    <div className="mt-5 space-y-1 flex-1 overflow-hidden">
                      {displayBookings.map(b => (
                        <div key={b.id} className="leading-tight border-l-2 border-blue-500 pl-1 mb-1 bg-gray-50/50 p-0.5 rounded">
                          
                          {/* 1. Event Name */}
                          <div className="font-bold truncate text-[9px] text-blue-800">
                            {b.slotTitle || "Event"}
                          </div>
                          
                          {/* 2. Organizer */}
                          <div className="truncate text-[8px] font-semibold text-gray-800">
                            {b.bookingName || "Organizer"}
                          </div>
                          
                          {/* 3. Department (Own Line - Full Width) */}
                          <div className="text-[8px] uppercase font-bold text-gray-500 truncate w-full">
                            {b.department || "GEN"}
                          </div>

                          {/* 4. Phone & Time (Combined Bottom Line) */}
                          <div className="flex justify-between items-center text-[8px] font-mono text-gray-700 mt-0.5">
                             <span className="truncate">{b.phone || "No Phone"}</span>
                             <span className="font-bold ml-1">{b.startTime}-{b.endTime}</span>
                          </div>

                        </div>
                      ))}
                      
                      {remaining > 0 && (
                        <div className="text-[9px] font-bold text-red-600 italic text-center mt-1 bg-red-50">
                          + {remaining} more (see list)
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Overflow Table */}
            {overflowBookings.length > 0 ? (
               <div className="mt-6 pt-4 border-t-4 border-black page-break-before-auto">
                 <h3 className="text-md font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                   <span className="bg-red-600 text-white px-2 py-1 rounded text-xs">Overflow</span>
                   <span>Additional Bookings</span>
                 </h3>
                 <table className="w-full text-left text-[10px] border-collapse border border-black">
                   <thead className="bg-gray-100">
                     <tr>
                       <th className="py-2 px-2 border border-black font-bold uppercase w-20">Date</th>
                       <th className="py-2 px-2 border border-black font-bold uppercase w-24">Time</th>
                       <th className="py-2 px-2 border border-black font-bold uppercase">Event / Title</th>
                       <th className="py-2 px-2 border border-black font-bold uppercase">Organizer Name</th>
                       <th className="py-2 px-2 border border-black font-bold uppercase w-24">Dept</th>
                       <th className="py-2 px-2 border border-black font-bold uppercase w-24">Phone</th>
                     </tr>
                   </thead>
                   <tbody>
                     {overflowBookings.map(b => (
                       <tr key={b.id}>
                         <td className="py-2 px-2 border border-black font-mono font-bold text-blue-600">
                           {new Date(b.date).toLocaleDateString()}
                         </td>
                         <td className="py-2 px-2 border border-black font-mono">
                           {b.startTime} - {b.endTime}
                         </td>
                         <td className="py-2 px-2 border border-black font-bold">{b.slotTitle}</td>
                         <td className="py-2 px-2 border border-black">{b.bookingName}</td>
                         <td className="py-2 px-2 border border-black uppercase text-xs">{b.department || "GEN"}</td>
                         <td className="py-2 px-2 border border-black font-mono">{b.phone || "-"}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            ) : (
               <div className="mt-8 text-center text-[10px] text-gray-400 italic border-t pt-4">
                 All bookings are visible in the calendar grid above.
               </div>
            )}

            <div className="mt-8 text-[10px] text-gray-400 flex justify-between">
              <span>Generated on {new Date().toLocaleDateString()}</span>
              <span>NHCE Seminar Booking System</span>
            </div>
          </div>
        </div>

      </div>

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
          .no-print { display: none !important; }
          .print-container {
            width: 100% !important;
            height: 100% !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .page-break-before-auto {
            page-break-before: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default ExportCalendarPage;