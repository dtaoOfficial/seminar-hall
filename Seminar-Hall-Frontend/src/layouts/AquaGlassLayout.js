// src/layouts/AquaGlassLayout.js
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
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

  return (
    <div className={`min-h-screen w-full flex flex-col relative overflow-x-hidden transition-colors duration-700 ${
      isDtao ? "bg-gradient-to-br from-black via-violet-950 to-[#1a001a] text-white" : "bg-gradient-to-br from-[#f8fbff] via-[#edf6ff] to-[#e9f5ff] text-slate-900"
    }`}>
      <GlobalStyles />
      
      {/* Background Blobs (Phase 2 Enhancement: Moving Blobs) */}
      {isDtao && (
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <motion.div
            animate={{ 
              x: [0, 50, 0],
              opacity: [0.4, 0.7, 0.4], 
              scale: [1, 1.2, 1] 
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-24 -left-16 w-[40rem] h-[40rem] rounded-full blur-[160px] bg-violet-700/20"
          />
        </div>
      )}

      <Navbar user={user} handleLogout={handleLogout} />

      <main className="relative flex-1 z-10 px-4 md:px-6 py-8 max-w-7xl mx-auto pt-24 w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname} // This triggers animation on sub-route change
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

      <footer className={`relative z-20 py-6 text-center text-xs border-t ${
        isDtao ? "border-violet-800 bg-black/50 text-violet-400" : "border-white/30 bg-white/40 text-gray-500"
      }`}>
        <p>© {new Date().getFullYear()} Developed by DTAOofficial — Maheswar Reddy Kuraparthi</p>
      </footer>
    </div>
  );
}