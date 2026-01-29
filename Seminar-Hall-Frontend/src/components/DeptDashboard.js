import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

// ❌ REMOVED: Navbar import (It is already in AquaGlassLayout)
import DeptSlotBooking from "../pages/Dept/AddSeminarPage";
import DeptStatus from "../pages/Dept/DeptStatus";
import DeptHistory from "../pages/Dept/DeptHistory";
import DeptDetails from "../pages/Dept/DeptDetails";
import DeptCalendarPage from "../pages/Dept/DeptCalendarPage";
import { useTheme } from "../contexts/ThemeContext";

const DeptDashboard = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [restored, setRestored] = useState(false);
  const [checking, setChecking] = useState(true);
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  // Restore user logic...
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
      } catch (err) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }
    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Role check logic...
  useEffect(() => {
    if (!restored) return;
    setChecking(true);
    const check = () => {
      if (!user) {
        navigate("/", { replace: true });
        return;
      }
      const role = (user.role || "").toString().trim().toLowerCase();
      if (role !== "department") {
        navigate("/", { replace: true });
      }
    };
    check();
    setChecking(false);
  }, [restored, user, navigate]);

  if (!restored || checking) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDtao ? "bg-[#08050b]" : "bg-gray-50"}`}>
        <div className={`${isDtao ? "bg-black/60 border border-violet-900 text-slate-100" : "bg-white"} text-center p-6 rounded shadow`}>
          <p>Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    // ✅ FIXED: Removed outer <div> wrapper that had background colors
    // We let AquaGlassLayout handle the main background.
    <div className="w-full h-full"> 
      {/* ❌ REMOVED: <Navbar /> (It caused the double navbar issue) */}

      <Routes>
        <Route path="/" element={<Navigate to="slot-booking" replace />} />
        <Route path="slot-booking" element={<DeptSlotBooking user={user} />} />
        <Route path="status" element={<DeptStatus user={user} />} />
        <Route path="history" element={<DeptHistory user={user} />} />
        <Route path="seminar-details" element={<DeptDetails />} />
        <Route path="calendar" element={<DeptCalendarPage />} />
        <Route path="*" element={<Navigate to="slot-booking" replace />} />
      </Routes>
    </div>
  );
};

export default DeptDashboard;