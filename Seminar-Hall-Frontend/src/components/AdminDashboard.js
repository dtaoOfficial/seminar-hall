import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CSVLink } from "react-csv";

/* ---------- Pages ---------- */
import AddUserPage from "../pages/Admin/AddUserPage";
import AddSeminarPage from "../pages/Admin/AddSeminarPage";
import RequestsPage from "../pages/Admin/RequestsPage";
import AllSeminarsPage from "../pages/Admin/AllSeminarsPage";
import AllDepartmentsPage from "../pages/Admin/AllDepartmentsPage";
import ManageDepartmentsPage from "../pages/Admin/ManageDepartmentsPage";
import ManageHallsPage from "../pages/Admin/ManageHallsPage";
import ManageOperatorsPage from "../pages/ManageOperators";
import SeminarDetails from "../pages/Admin/SeminarDetails";
import ExportPage from "../pages/Admin/ExportPage";
import AdminCalendarPage from "../pages/Admin/AdminCalendarPage";

/* ---------- Tools ---------- */
import api from "../utils/api";
import { useNotification } from "../components/NotificationsProvider";
import { useTheme } from "../contexts/ThemeContext";

/* ---------- Motion ---------- */
const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 280, damping: 22 } }
};

/* ---------- Helpers ---------- */
const isoDate = (d = new Date()) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

const safeDate = (d) => {
  if (!d) return "--";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "--" : isoDate(dt);
};

const normalizeSeminar = (s) => ({
  id: s._id || s.id,
  slotTitle: s.slotTitle || s.title || "Untitled",
  hallName: s.hallName || s.hall || "--",
  department: s.department || "--",
  date: s.date,
  startTime: s.startTime,
  endTime: s.endTime,
  status: s.status || "APPROVED"
});

/* ---------- Component ---------- */
const AdminDashboard = ({ user }) => {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  const [seminars, setSeminars] = useState([]);
  const [halls, setHalls] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [selectedHall, setSelectedHall] = useState("");
  const [selectedDate, setSelectedDate] = useState(isoDate());
  const [hallBookings, setHallBookings] = useState([]);
  const [hallLoading, setHallLoading] = useState(false);

  /* ---------- Fetchers ---------- */
  const fetchSeminars = useCallback(async () => {
    try {
      const res = await api.get("/seminars");
      setSeminars(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setSeminars([]);
    }
  }, []);

  const fetchHalls = useCallback(async () => {
    try {
      const res = await api.get("/halls");
      const data = Array.isArray(res?.data) ? res.data : [];
      setHalls(data);
      if (!selectedHall && data.length) setSelectedHall(data[0].hallName || data[0].name);
    } catch {
      setHalls([]);
    }
  }, [selectedHall]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get("/users");
      setUsers(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setUsers([]);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await api.get("/departments");
      setDepartments(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setDepartments([]);
    }
  }, []);

  useEffect(() => {
    fetchSeminars();
    fetchHalls();
    fetchUsers();
    fetchDepartments();
  }, [fetchSeminars, fetchHalls, fetchUsers, fetchDepartments]);

  const fetchHallDay = useCallback(async () => {
    if (!selectedHall || !selectedDate) return;
    setHallLoading(true);
    try {
      const res = await api.get(`/seminars/day/${selectedDate}?hallName=${selectedHall}`);
      setHallBookings(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setHallBookings([]);
    } finally {
      setHallLoading(false);
    }
  }, [selectedHall, selectedDate]);

  useEffect(() => {
    fetchHallDay();
  }, [fetchHallDay]);

  /* ---------- Derived ---------- */
  const recent = useMemo(
    () => seminars.map(normalizeSeminar).reverse().slice(0, 8),
    [seminars]
  );

  const stats = useMemo(() => ({
    users: users.length,
    seminars: seminars.length,
    halls: halls.length,
    departments: departments.length,
    pending: seminars.filter(s => s.status === "PENDING").length,
    approved: seminars.filter(s => s.status === "APPROVED").length,
  }), [users, seminars, halls, departments]);

  if (!user) return null;

  return (
    <div className={`w-full ${isDtao ? "text-slate-100" : "text-slate-900"}`}>
      <Routes>
        <Route path="add-user" element={<AddUserPage />} />
        <Route path="add-seminar" element={<AddSeminarPage halls={halls} />} />
        <Route path="requests" element={<RequestsPage />} />
        <Route path="seminars" element={<AllSeminarsPage seminars={seminars} />} />
        <Route path="departments" element={<AllDepartmentsPage />} />
        <Route path="manage-departments" element={<ManageDepartmentsPage />} />
        <Route path="operators" element={<ManageOperatorsPage />} />
        <Route path="seminar-details" element={<SeminarDetails />} />
        <Route path="halls" element={<ManageHallsPage halls={halls} />} />
        <Route path="export" element={<ExportPage />} />
        <Route path="calendar" element={<AdminCalendarPage />} />

        {/* ---------- DASHBOARD ---------- */}
        <Route
          path="*"
          element={
            <motion.div
              variants={container}
              initial="hidden"
              animate="visible"
              className="space-y-8"
            >
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Object.entries(stats).map(([k, v]) => (
                  <motion.div
                    key={k}
                    variants={item}
                    whileHover={{ y: -6, scale: 1.03 }}
                    className={`rounded-2xl p-5 text-center border ${
                      isDtao ? "bg-white/5 border-violet-800/40" : "bg-white shadow-sm"
                    }`}
                  >
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">{k}</p>
                    <p className="text-2xl font-black text-blue-500">{v}</p>
                  </motion.div>
                ))}
              </div>

              {/* Main Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Hall View */}
                <motion.div variants={item} className={`rounded-3xl p-8 border shadow-2xl ${isDtao ? "bg-black/40 border-violet-900/50" : "bg-white"}`}>
                  <h3 className="text-2xl font-black mb-6">Hall Availability</h3>

                  <div className="flex gap-4 mb-6">
                    <select
                      value={selectedHall}
                      onChange={(e) => setSelectedHall(e.target.value)}
                      className="flex-1 rounded-xl px-4 py-3 border outline-none"
                    >
                      {halls.map((h, i) => (
                        <option key={i} value={h.hallName || h.name}>
                          {h.hallName || h.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="rounded-xl px-4 py-3 border outline-none"
                    />
                  </div>

                  <div className="space-y-3 min-h-[160px]">
                    {hallLoading ? (
                      <p className="text-center text-slate-400 animate-pulse">Loading schedule…</p>
                    ) : hallBookings.length ? (
                      hallBookings.map((b, i) => (
                        <div key={i} className="p-4 rounded-xl bg-slate-50 flex justify-between">
                          <div>
                            <p className="font-bold">{b.slotTitle}</p>
                            <p className="text-xs text-slate-500">{b.department}</p>
                          </div>
                          <span className="text-xs font-bold text-blue-500">
                            {b.startTime} – {b.endTime}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-slate-400">No bookings</p>
                    )}
                  </div>

                  <button
                    onClick={() => navigate("calendar")}
                    className="mt-6 w-full py-4 rounded-2xl font-black uppercase tracking-widest bg-gradient-to-r from-blue-600 to-cyan-500 text-white"
                  >
                    Open Calendar
                  </button>
                </motion.div>

                {/* Recent */}
                <motion.div variants={item} className={`rounded-3xl p-8 border shadow-2xl ${isDtao ? "bg-black/40 border-violet-900/50" : "bg-white"}`}>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-black">Recent Activity</h3>
                    <CSVLink
                      data={recent}
                      filename="seminars.csv"
                      className="text-xs font-black uppercase text-blue-500"
                    >
                      Export CSV
                    </CSVLink>
                  </div>

                  <div className="space-y-3">
                    {recent.length ? (
                      recent.map((s) => (
                        <div key={s.id} className="p-4 rounded-xl bg-slate-50 flex justify-between">
                          <div>
                            <p className="font-bold truncate">{s.slotTitle}</p>
                            <p className="text-xs text-slate-500">{s.hallName} • {safeDate(s.date)}</p>
                          </div>
                          <button
                            onClick={() => navigate("/admin/seminars")}
                            className="text-xs font-black text-blue-500"
                          >
                            View
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-slate-400">No recent records</p>
                    )}
                  </div>
                </motion.div>
              </div>

              <footer className="pt-10 text-center text-[10px] uppercase tracking-[0.4em] text-slate-400">
                © {new Date().getFullYear()} DTAOofficial — Admin Console
              </footer>
            </motion.div>
          }
        />
      </Routes>
    </div>
  );
};

export default AdminDashboard;
