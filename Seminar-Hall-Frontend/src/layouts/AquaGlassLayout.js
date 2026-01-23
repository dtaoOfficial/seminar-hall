// src/layouts/AquaGlassLayout.js
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation, Link } from "react-router-dom"; // Added Link
import Navbar from "../components/Navbar";
import GlobalStyles from "../styles/GlobalStyles";
import { useTheme } from "../contexts/ThemeContext";
import AuthService from "../utils/AuthService";

export default function AquaGlassLayout({ children, user, setUser }) {
  const { theme } = useTheme() || {};
  const [showSmallWarning, setShowSmallWarning] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkSize = () => {
      setShowSmallWarning(window.innerWidth < 360);
    };
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  const handleLogout = () => {
    try {
      const path = window.location.pathname || "";
      const role = path.startsWith("/admin") ? "ADMIN" : "DEPARTMENT";
      AuthService.logout(role);
      setUser?.(null);
      navigate("/", { replace: true });
    } catch (err) {
      navigate("/", { replace: true });
    }
  };

  const isDtao = theme === "dtao";
  // Professional Footer Colors
  const footerText = isDtao ? "text-violet-400" : "text-slate-500";
  const footerBg = isDtao ? "bg-black/80 border-violet-900/30" : "bg-white/60 border-slate-200";

  return (
    <div className={`min-h-screen w-full flex flex-col relative overflow-x-hidden transition-colors duration-700 ${
      isDtao ? "bg-gradient-to-br from-black via-violet-950 to-[#1a001a] text-white" : "bg-gradient-to-br from-[#f8fbff] via-[#edf6ff] to-[#e9f5ff] text-slate-900"
    }`}>
      <GlobalStyles />
      
      {/* Background Blobs */}
      {isDtao && (
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <motion.div
            animate={{ x: [0, 50, 0], opacity: [0.4, 0.7, 0.4], scale: [1, 1.2, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-24 -left-16 w-[40rem] h-[40rem] rounded-full blur-[160px] bg-violet-700/20"
          />
        </div>
      )}

      {/* ✅ Navbar is HERE (Only one instance now) */}
      <Navbar user={user} handleLogout={handleLogout} />

      <main className="relative flex-1 z-10 px-4 md:px-6 py-8 max-w-7xl mx-auto pt-24 w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname} 
            initial={{ opacity: 0, y: 15, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -15, filter: "blur(10px)" }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="w-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ✅ UPDATED FOOTER: No Name, 5 Links added */}
      <footer className={`relative z-20 py-8 text-center text-xs border-t backdrop-blur-md ${footerBg} ${footerText}`}>
        <div className="flex flex-col items-center gap-3">
          
          {/* 1. Copyright Line */}
          <p className="font-medium tracking-wide opacity-80">
            © {new Date().getFullYear()} Venue Management System — All Rights Reserved.
          </p>

          {/* 2. The 5 Professional Links (Fake links for UI) */}
          <div className="flex flex-wrap justify-center gap-4 mt-1 opacity-70">
            <span className="cursor-pointer hover:underline">Dashboard</span>
            <span>•</span>
            <span className="cursor-pointer hover:underline">Bookings</span>
            <span>•</span>
            <span className="cursor-pointer hover:underline">Rules & Regulations</span>
            <span>•</span>
            <span className="cursor-pointer hover:underline">Privacy Policy</span>
            <span>•</span>
            <span className="cursor-pointer hover:underline">Help Center</span>
          </div>

        </div>
      </footer>
    </div>
  );
}