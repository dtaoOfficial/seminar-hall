import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { CSVLink } from "react-csv";
import api from "../utils/api";
import { useNotification } from "../components/NotificationsProvider";
import { useTheme } from "../contexts/ThemeContext";

/* ---------- Pages ---------- */
import AddUserPage from "../pages/Admin/AddUserPage";
import AddSeminarPage from "../pages/Admin/AddSeminarPage";
import RequestsPage from "../pages/Admin/RequestsPage";
import AllSeminarsPage from "../pages/Admin/AllSeminarsPage";
import AllDepartmentsPage from "../pages/Admin/AllDepartmentsPage";
import ManageDepartmentsPage from "../pages/Admin/ManageDepartmentsPage";
import ManageHallsPage from "../pages/Admin/ManageHallsPage.js";
import ManageOperatorsPage from "../pages/ManageOperators";
import SeminarDetails from "../pages/Admin/SeminarDetails";
import ExportPage from "../pages/Admin/ExportPage";
import AdminCalendarPage from "../pages/Admin/AdminCalendarPage";
import SystemLogsPage from "../pages/Admin/SystemLogsPage";
import ExportCalendarPage from "../pages/Admin/ExportCalendarPage";

/* ---------- Helpers ---------- */
const localISODate = (d = new Date()) => {
  const dt = d instanceof Date ? d : new Date(String(d));
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

const safeDate = (d) => {
  if (!d) return "--";
  try {
    const dt = new Date(String(d));
    if (isNaN(dt.getTime())) return "--";
    return localISODate(dt);
  } catch { return "--"; }
};

const normalizeSeminar = (s) => ({
  id: s._id ?? s.id ?? Math.random().toString(36).slice(2),
  hallName: s.hallName || (s.hall && s.hall.name) || "--",
  slotTitle: s.slotTitle || s.title || "Untitled Seminar",
  bookingName: s.bookingName || s.organizer || "--",
  department: s.department || s.dept || "",
  date: s.date ?? s.appliedAt ?? null,
  startTime: s.startTime || "",
  endTime: s.endTime || "",
  status: (s.status || "APPROVED").toString(),
});

const AdminDashboard = ({ user }) => {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  const [seminars, setSeminars] = useState([]);
  const [halls, setHalls] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHall, setSelectedHall] = useState("");
  const [selectedDate, setSelectedDate] = useState(localISODate());
  const [hallDayBookings, setHallDayBookings] = useState([]);
  const [hallDayLoading, setHallDayLoading] = useState(false);
  const [requestsFeed, setRequestsFeed] = useState([]);

  /* fetchers */
  const fetchSeminars = useCallback(async () => {
    try {
      const res = await api.get("/seminars");
      setSeminars(Array.isArray(res?.data) ? res.data : []);
    } catch { setSeminars([]); }
  }, []);

  const fetchHalls = useCallback(async () => {
    try {
      const res = await api.get("/halls");
      const data = Array.isArray(res?.data) ? res.data : [];
      setHalls(data);
      if (!selectedHall && data.length > 0) {
        setSelectedHall(data[0].hallName || data[0].name || "");
      }
    } catch { setHalls([]); }
  }, [selectedHall]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get("/users");
      setUsers(Array.isArray(res?.data) ? res.data : []);
    } catch { setUsers([]); }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await api.get("/departments");
      setDepartments(Array.isArray(res?.data) ? res.data : []);
    } catch { setDepartments([]); }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([fetchSeminars(), fetchHalls(), fetchUsers(), fetchDepartments()])
      .finally(() => setLoading(false));
  }, [fetchSeminars, fetchHalls, fetchUsers, fetchDepartments]);

  const fetchHallDay = useCallback(async () => {
    if (!selectedHall || !selectedDate) return;
    setHallDayLoading(true);
    try {
      const res = await api.get(`/seminars/day/${encodeURIComponent(selectedDate)}?hallName=${encodeURIComponent(selectedHall)}`);
      // Update 1: FILTER ONLY APPROVED BOOKINGS
      const raw = Array.isArray(res?.data) ? res.data : [];
      const approvedOnly = raw.filter(b => (b.status || "APPROVED").toUpperCase() === "APPROVED");
      setHallDayBookings(approvedOnly);
    } catch { setHallDayBookings([]); }
    finally { setHallDayLoading(false); }
  }, [selectedHall, selectedDate]);

  useEffect(() => { fetchHallDay(); }, [fetchHallDay]);

  /* Polling Feed */
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await api.get("/seminars");
        if (cancelled) return;
        const feed = (res?.data || [])
          .filter(s => ["PENDING", "CANCEL_REQUESTED"].includes((s.status || "").toUpperCase()))
          .map(s => ({
            id: s._id || s.id,
            title: s.slotTitle || s.title || "Booking",
            hall: s.hallName || "—",
            date: safeDate(s.date || s.appliedAt),
            type: s.status === "PENDING" ? "Booking Request" : "Cancel Request",
          }));
        setRequestsFeed(prev => JSON.stringify(feed) === JSON.stringify(prev) ? prev : feed);
      } catch {} 
      finally { if (!cancelled) setTimeout(poll, 10000); }
    };
    poll();
    return () => { cancelled = true; };
  }, []);

  const recentSeminars = useMemo(() => seminars.map(normalizeSeminar).reverse().slice(0, 8), [seminars]);

  const stats = useMemo(() => ({
    users: users.length,
    requests: seminars.filter(s => ["PENDING", "CANCEL_REQUESTED"].includes(s.status?.toUpperCase())).length,
    // Update 2: Renamed keys for display mapping below
    "TOTAL VENUES": halls.length, 
    departments: departments.length,
    "APPROVED BOOKINGS": seminars.filter(s => s.status === "APPROVED").length,
    "ALL RECORDS": seminars.length
  }), [users, seminars, halls, departments]);

  if (!user) return null;

  return (
    <div className="w-full">
      <main className="w-full">
        <Routes>
          <Route path="add-user" element={<AddUserPage />} />
          <Route path="add-seminar" element={<AddSeminarPage halls={halls} />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="seminars" element={<AllSeminarsPage seminars={seminars} />} />
          <Route path="departments" element={<AllDepartmentsPage />} />
          <Route path="manage-departments" element={<ManageDepartmentsPage />} />
          <Route path="operators" element={<ManageOperatorsPage />} />
          <Route path="seminar-details" element={<SeminarDetails />} />
          <Route path="halls" element={<ManageHallsPage fetchHalls={fetchHalls} halls={halls} />} />
          <Route path="export" element={<ExportPage />} />
          <Route path="calendar" element={<AdminCalendarPage />} />
          <Route path="logs" element={<SystemLogsPage />} />
          <Route path="export-calendar" element={<ExportCalendarPage />} />

          <Route
            path="*"
            element={
              <div className="space-y-6 pt-2">
                {/* Ticker */}
                {requestsFeed.length > 0 && (
                  <div className={`${isDtao ? "bg-black/40 border-violet-900 text-slate-100" : "bg-white shadow-sm border-gray-200"} rounded-xl p-2 border overflow-hidden`}>
                    <style>{`
                      @keyframes tickerScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                      .ticker-play { animation: tickerScroll 20s linear infinite; display: inline-flex; gap: 40px; white-space: nowrap; }
                    `}</style>
                    <div className="ticker-play">
                      {[...requestsFeed, ...requestsFeed].map((it, idx) => (
                        <span key={idx} className="text-sm font-extrabold">
                          <span className="text-blue-500 uppercase">{it.type}:</span> {it.title} — {it.hall} ({it.date})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {Object.entries(stats).map(([k, v]) => (
                    <div key={k} className={`rounded-2xl p-5 text-center border shadow-sm transition-all ${isDtao ? "bg-black/40 border-violet-800" : "bg-white border-gray-200"}`}>
                      <p className="text-3xl font-black text-blue-600">{v}</p>
                      <p className={`mt-1 text-[10px] uppercase font-black tracking-widest ${isDtao ? "text-slate-300" : "text-black"}`}>{k}</p>
                    </div>
                  ))}
                </div>

                {/* Main Dashboard Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Availability Section */}
                  <div className={`rounded-[2.5rem] p-8 border shadow-xl ${isDtao ? "bg-black/50 border-violet-900" : "bg-white border-gray-100"}`}>
                    <h3 className={`text-xl font-black mb-6 ${isDtao ? "text-white" : "text-black"}`}>Venue Availability</h3>
                    <div className="flex flex-col sm:flex-row gap-3 mb-6">
                      <select 
                        style={isDtao ? {backgroundColor: "#1a1a2e", color: "white"} : {color: "black"}}
                        className={`flex-1 rounded-xl px-4 py-3 border outline-none font-bold text-sm ${isDtao ? "border-violet-700" : "border-slate-300 bg-white"}`}
                        value={selectedHall} onChange={(e) => setSelectedHall(e.target.value)}
                      >
                        {halls.map((h, i) => <option key={i} value={h.hallName || h.name}>{h.hallName || h.name}</option>)}
                      </select>
                      
                      <input 
                        type="date" 
                        style={isDtao ? { backgroundColor: "#1a1a2e", color: "white", colorScheme: "dark" } : { color: "black" }}
                        className={`rounded-xl px-4 py-3 border outline-none font-bold text-sm ${isDtao ? "border-violet-700" : "border-slate-300 bg-white"}`}
                        value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                      />
                    </div>
                    <div className={`rounded-2xl p-4 min-h-[180px] border border-dashed ${isDtao ? "bg-black/20 border-violet-800" : "bg-slate-50 border-slate-200"}`}>
                      {hallDayLoading ? <div className={`text-center py-10 animate-pulse font-bold ${isDtao ? "text-white" : "text-black"}`}>Checking records...</div> : 
                        hallDayBookings.length ? (
                          <ul className="space-y-3">
                            {hallDayBookings.map((b, i) => (
                              <li key={i} className={`p-3 rounded-xl flex justify-between items-center ${isDtao ? "bg-white/5" : "bg-white shadow-sm border border-gray-100"}`}>
                                <div>
                                  <div className={`font-black text-sm ${isDtao ? "text-white" : "text-black"}`}>{b.slotTitle}</div>
                                  <div className={`text-[10px] uppercase font-black ${isDtao ? "text-slate-400" : "text-slate-600"}`}>{b.bookingName}</div>
                                </div>
                                <div className="text-xs font-black text-blue-500">{b.startTime} - {b.endTime}</div>
                              </li>
                            ))}
                          </ul>
                        ) : <div className={`text-center py-10 text-sm font-bold opacity-40 ${isDtao ? "text-white" : "text-black"}`}>No approved bookings for this date.</div>}
                    </div>
                    {/* ✅ UPDATED BUTTON GRID */}
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button onClick={() => navigate("calendar")} className="py-4 rounded-2xl font-black uppercase tracking-widest bg-blue-600 text-white shadow-lg shadow-blue-500/30 transition-transform active:scale-95 text-xs">
                        Full Calendar
                      </button>
                      <button onClick={() => navigate("export-calendar")} className={`py-4 rounded-2xl font-black uppercase tracking-widest border transition-transform active:scale-95 text-xs ${isDtao ? "bg-white/10 text-white border-white/10 hover:bg-white/20" : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"}`}>
                        Print Register
                      </button>
                    </div>
                  </div>

                  {/* Activity Section */}
                  <aside className={`rounded-[2.5rem] p-8 border shadow-xl ${isDtao ? "bg-black/50 border-violet-900" : "bg-white border-gray-100"}`}>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className={`text-xl font-black ${isDtao ? "text-white" : "text-black"}`}>Recent Bookings</h3>
                      <CSVLink data={recentSeminars} filename="history.csv" className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline">Export CSV</CSVLink>
                    </div>
                    <div className="space-y-3">
                      {recentSeminars.map((s, i) => (
                        <div key={i} className={`p-4 rounded-2xl border transition-all hover:border-blue-500/50 ${isDtao ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-100"}`}>
                           <div className="text-blue-500 font-black text-[10px] uppercase tracking-wider mb-1">{s.hallName}</div>
                           <div className={`text-sm font-black truncate ${isDtao ? "text-white" : "text-black"}`}>{s.slotTitle}</div>
                           <div className={`text-[10px] font-black mt-1 uppercase ${isDtao ? "text-slate-400" : "text-slate-500"}`}>{s.bookingName} • {safeDate(s.date)}</div>
                        </div>
                      ))}
                    </div>
                  </aside>
                </div>

                <footer className={`pt-12 pb-6 text-center text-[9px] uppercase tracking-[0.4em] font-black opacity-30 ${isDtao ? "text-white" : "text-black"}`}>
                  © {new Date().getFullYear()} NHCE — Management Dashboard
                </footer>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
};

export default AdminDashboard;