import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// Pages
import DeptSlotBooking from "../pages/Dept/AddSeminarPage";
import DeptStatus from "../pages/Dept/DeptStatus";
import DeptHistory from "../pages/Dept/DeptHistory";
import DeptDetails from "../pages/Dept/DeptDetails";
import DeptCalendarPage from "../pages/Dept/DeptCalendarPage";

// Tools
import { useTheme } from "../contexts/ThemeContext";

/* ---------- Page Animation (Clean & Professional) ---------- */
const pageMotion = {
  initial: { opacity: 0, x: 20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

const DeptDashboard = ({ user, setUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  const [restored, setRestored] = useState(false);
  const [checking, setChecking] = useState(true);

  /* ---------- Restore Session (UNCHANGED LOGIC) ---------- */
  useEffect(() => {
    if (!user) {
      try {
        const raw = localStorage.getItem("user");
        if (raw && raw !== "undefined" && raw !== "null") {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            setUser(parsed);
          }
        }
      } catch {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }
    setRestored(true);
  }, [user, setUser]);

  /* ---------- Role Enforcement (UNCHANGED LOGIC) ---------- */
  useEffect(() => {
    if (!restored) return;

    setChecking(true);
    if (!user) {
      navigate("/", { replace: true });
      return;
    }

    const role = String(user.role || "").toLowerCase();
    if (role !== "department") {
      navigate("/", { replace: true });
      return;
    }

    setChecking(false);
  }, [restored, user, navigate]);

  /* ---------- Loader ---------- */
  if (!restored || checking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className={`w-10 h-10 border-4 border-t-transparent rounded-full ${
            isDtao ? "border-violet-500" : "border-blue-500"
          }`}
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Navbar handled globally */}

      <main className="w-full" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageMotion}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Routes location={location}>
              <Route path="/" element={<Navigate to="slot-booking" replace />} />
              <Route path="slot-booking" element={<DeptSlotBooking user={user} />} />
              <Route path="status" element={<DeptStatus user={user} />} />
              <Route path="history" element={<DeptHistory user={user} />} />
              <Route path="seminar-details" element={<DeptDetails />} />
              <Route path="calendar" element={<DeptCalendarPage />} />
              <Route path="*" element={<Navigate to="slot-booking" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default DeptDashboard;
