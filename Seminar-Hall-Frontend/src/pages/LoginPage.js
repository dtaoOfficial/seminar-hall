// src/pages/LoginPage.js
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AuthService from "../utils/AuthService";
import BackendIndicator from "../components/BackendIndicator";
import WaitingGame from "../components/WaitingGame";
import { useTheme } from "../contexts/ThemeContext";

/* ---------- Icons ---------- */
const Eye = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOff = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.97 10.97 0 0112 20c-7 0-11-8-11-8" />
    <path d="M1 1l22 22" />
  </svg>
);

const LoginPage = ({ setUser }) => {
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [backendStatus, setBackendStatus] = useState("checking");
  
  const [showGamePrompt, setShowGamePrompt] = useState(false);
  const [playGame, setPlayGame] = useState(false);
  const [showSorryPrompt, setShowSorryPrompt] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [dots, setDots] = useState(".");

  const navigate = useNavigate();

  useEffect(() => {
    const token = AuthService.getToken?.();
    const role = AuthService.getRole?.();
    if (token && role) {
      navigate(role === "ADMIN" ? "/admin" : "/dept", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (backendStatus !== "offline") return;
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "." : prev + "."));
    }, 700);
    return () => clearInterval(interval);
  }, [backendStatus]);

  useEffect(() => {
    if (backendStatus === "offline") {
      setShowGif(true);
      setShowGamePrompt(true);
      const timer = setTimeout(() => {
        if (backendStatus === "offline") setShowSorryPrompt(true);
      }, 60000);
      return () => clearTimeout(timer);
    } else if (backendStatus === "online") {
      setShowGif(false);
      setShowGamePrompt(false);
      setPlayGame(false);
      setShowSorryPrompt(false);
    }
  }, [backendStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await AuthService.login(email, password);
      setUser?.(data.user);
      const role = (data.role || data.user?.role || "DEPARTMENT").toUpperCase();
      setTimeout(
        () => navigate(role === "ADMIN" ? "/admin" : "/dept", { replace: true }),
        400
      );
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row relative transition-colors duration-700 ${isDtao ? "bg-[#08050b]" : "bg-slate-50"}`}>

      {/* LEFT PANEL */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="hidden md:flex flex-1 items-center justify-center bg-cover bg-center relative overflow-hidden"
        style={{ backgroundImage: "url('https://res.cloudinary.com/duhki4wze/image/upload/v1757228960/NHCE_Photo_jhutdr.webp')" }}
      >
        <div className={`absolute inset-0 backdrop-blur-[3px] ${isDtao ? "bg-black/60" : "bg-white/30"}`} />
        
        <div className="relative z-10 text-center px-10">
          <img
            src="https://res.cloudinary.com/duhki4wze/image/upload/v1756755114/nhce_25-scaled-2_a6givc.png"
            alt="NHCE"
            className="w-56 mx-auto mb-8 drop-shadow-2xl"
          />
          <h1 className={`text-5xl font-extrabold tracking-tighter leading-tight ${isDtao ? "text-white" : "text-black"}`}>
            New Horizon <br /> College of Engineering
          </h1>
          
          <p className={`mt-6 text-xs tracking-[0.4em] uppercase font-bold ${isDtao ? "text-white" : "text-black"}`}>
            Seminar Hall Management Portal
          </p>
        </div>
      </motion.div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-y-auto">
        <div className="md:hidden mb-8 text-center">
            <img src="https://res.cloudinary.com/duhki4wze/image/upload/v1756755114/nhce_25-scaled-2_a6givc.png" className="w-32 mx-auto mb-4" alt="NHCE" />
            <h2 className={`text-xl font-bold ${isDtao ? "text-white" : "text-black"}`}>NHCE Seminar Portal</h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          className={`w-full max-w-md p-8 md:p-10 rounded-[3rem] backdrop-blur-3xl border shadow-2xl ${
            isDtao ? "bg-black/40 border-violet-900/50" : "bg-white/95 border-white"
          }`}
        >
          <AnimatePresence>
            {backendStatus === "offline" && showGif && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center mb-8">
                <div className="relative">
                  <img src="/Loading.gif" alt="Loading" className="w-32 h-32 md:w-40 md:h-40 drop-shadow-2xl" />
                  <div className="absolute inset-0 rounded-full bg-blue-400/20 blur-xl animate-pulse" />
                </div>
                <p className={`mt-4 font-bold text-sm ${isDtao ? "text-white" : "text-black"}`}>
                  ☕ Backend waking up{dots}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mb-8">
            <h2 className={`text-4xl font-extrabold tracking-tighter ${isDtao ? "text-white" : "text-black"}`}>Login</h2>
            <p className={`text-[10px] uppercase tracking-[0.2em] font-bold mt-2 ml-1 ${isDtao ? "text-white/70" : "text-black/70"}`}>
              Access your dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className={`text-[10px] uppercase tracking-widest font-extrabold ml-1 ${isDtao ? "text-white" : "text-black"}`}>Email Address</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                disabled={loading} required placeholder="admin@college.edu"
                className={`w-full px-5 py-4 rounded-2xl font-bold outline-none border transition-all ${
                  isDtao ? "bg-white/5 border-violet-800 text-white focus:border-violet-500" : "bg-white border-slate-300 text-black focus:border-black"
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between px-1">
                <label className={`text-[10px] uppercase tracking-widest font-extrabold ${isDtao ? "text-white" : "text-black"}`}>Password</label>
                <Link to="/forgot" className={`text-[10px] font-extrabold uppercase tracking-widest ${isDtao ? "text-violet-400" : "text-blue-700"}`}>Forgot?</Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  disabled={loading} required placeholder="••••••••"
                  className={`w-full px-5 py-4 pr-14 rounded-2xl font-bold outline-none border transition-all ${
                    isDtao ? "bg-white/5 border-violet-800 text-white focus:border-violet-500" : "bg-white border-slate-300 text-black focus:border-black"
                  }`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute right-5 top-1/2 -translate-y-1/2 transition-colors ${isDtao ? "text-white" : "text-black"}`}>
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] uppercase tracking-widest font-extrabold bg-rose-500/10 text-rose-600 p-4 rounded-2xl text-center border border-rose-500/20">
                {error}
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              disabled={loading || backendStatus !== "online"}
              className={`w-full py-5 rounded-2xl font-extrabold uppercase tracking-widest shadow-xl transition-all ${
                backendStatus === "online" 
                  ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-blue-500/20" 
                  : "bg-slate-300 text-slate-600 cursor-not-allowed shadow-none"
              }`}
            >
              {loading ? "Signing in..." : backendStatus === "online" ? "Login" : "Server Waking Up..."}
            </motion.button>
          </form>

          <AnimatePresence>
            {showGamePrompt && backendStatus === "offline" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-8 text-center p-4 rounded-2xl bg-white/5 border border-white/5">
                <p className={`text-xs font-extrabold mb-3 ${isDtao ? "text-white" : "text-black"}`}>
                  {showSorryPrompt ? "😅 Bro backend is really sleepy today... Play again?" : "Wanna play a mini game while waiting?"}
                </p>
                <div className="flex justify-center gap-3">
                  <button onClick={() => { setPlayGame(true); setShowGamePrompt(false); }} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest shadow-lg">Yes 🎮</button>
                  <button onClick={() => setShowGamePrompt(false)} className={`px-4 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-widest border ${isDtao ? "border-white/10 text-white" : "border-slate-300 text-black"}`}>No</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-10 flex flex-col items-center gap-4">
             <BackendIndicator onStatusChange={setBackendStatus} />
          </div>
        </motion.div>
      </div>

      <WaitingGame
        visible={playGame}
        backendOnline={backendStatus === "online"}
        onExit={() => {
          setPlayGame(false);
          if (backendStatus === "offline") setShowGamePrompt(true);
        }}
      />
    </div>
  );
};

export default LoginPage;