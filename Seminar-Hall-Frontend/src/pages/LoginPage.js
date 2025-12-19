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
  const [playGame, setPlayGame] = useState(false);

  const navigate = useNavigate();

  /* ---------- Auto Redirect ---------- */
  useEffect(() => {
    const token = AuthService.getToken?.();
    const role = AuthService.getRole?.();
    if (token && role) {
      navigate(role === "ADMIN" ? "/admin" : "/dept", { replace: true });
    }
  }, [navigate]);

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
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="hidden md:flex flex-1 items-center justify-center bg-cover bg-center relative overflow-hidden"
        style={{ backgroundImage: "url('https://res.cloudinary.com/duhki4wze/image/upload/v1757228960/NHCE_Photo_jhutdr.webp')" }}
      >
        <div className={`absolute inset-0 backdrop-blur-[2px] ${isDtao ? "bg-black/50" : "bg-white/20"}`} />
        
        <div className="relative z-10 text-center px-10">
          <img
            src="https://res.cloudinary.com/duhki4wze/image/upload/v1756755114/nhce_25-scaled-2_a6givc.png"
            alt="NHCE"
            className="w-48 mx-auto mb-8 drop-shadow-2xl"
          />
          <h1 className={`text-5xl font-black tracking-tighter leading-tight ${isDtao ? "text-white" : "text-slate-900"}`}>
            New Horizon <br /> College of Engineering
          </h1>
          <p className={`mt-6 text-xs tracking-[0.4em] uppercase font-black ${isDtao ? "text-violet-400" : "text-blue-600"}`}>
            Venue Management System
          </p>
        </div>
      </motion.div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          className={`w-full max-w-md p-10 rounded-[3rem] backdrop-blur-3xl border shadow-2xl ${
            isDtao ? "bg-black/40 border-violet-900/50" : "bg-white/90 border-white"
          }`}
        >
          <div className="mb-10">
            <h2 className="text-4xl font-black tracking-tighter">Login</h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mt-2 ml-1">
              Sign in to your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-slate-400 font-black ml-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                placeholder="name@college.edu"
                className={`w-full px-6 py-4 rounded-2xl font-bold outline-none border ${
                  isDtao
                    ? "bg-white/5 border-violet-800 text-white"
                    : "bg-slate-50 border-slate-200"
                }`}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex justify-between px-1">
                <label className="text-[10px] uppercase tracking-widest text-slate-400 font-black">
                  Password
                </label>
                <Link
                  to="/forgot"
                  className={`text-[10px] font-black uppercase tracking-widest ${
                    isDtao ? "text-violet-400" : "text-blue-600"
                  }`}
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  placeholder="••••••••"
                  className={`w-full px-6 py-4 pr-14 rounded-2xl font-bold outline-none border ${
                    isDtao
                      ? "bg-white/5 border-violet-800 text-white"
                      : "bg-slate-50 border-slate-200"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div className="text-[10px] uppercase tracking-widest font-black bg-rose-500/10 text-rose-500 p-4 rounded-2xl text-center">
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading || backendStatus !== "online"}
              className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest ${
                backendStatus === "online"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white"
                  : "bg-slate-200 text-slate-400"
              }`}
            >
              {loading ? "Logging in..." : backendStatus === "online" ? "Login" : "Server unavailable"}
            </motion.button>
          </form>

          <div className="mt-10 flex justify-center opacity-40">
            <BackendIndicator onStatusChange={setBackendStatus} />
          </div>
        </motion.div>
      </div>

      <WaitingGame
        visible={playGame}
        backendOnline={backendStatus === "online"}
        onExit={() => setPlayGame(false)}
      />
    </div>
  );
};

export default LoginPage;
