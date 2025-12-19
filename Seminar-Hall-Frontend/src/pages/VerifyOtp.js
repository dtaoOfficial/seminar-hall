import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../utils/api";
import { useTheme } from "../contexts/ThemeContext";

/* ---------- Helpers ---------- */
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const SPRING = { type: "spring", stiffness: 300, damping: 28 };

export default function VerifyOtp() {
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  const query = useQuery();
  const navigate = useNavigate();

  const [email, setEmail] = useState(query.get("email") || "");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  const otpRef = useRef(null);

  const RESEND_COOLDOWN = 60;
  const OTP_TTL = 300;

  const [cooldown, setCooldown] = useState(0);
  const [remaining, setRemaining] = useState(OTP_TTL);

  const cooldownRef = useRef(null);
  const countdownRef = useRef(null);

  /* ---------- Timers ---------- */
  useEffect(() => {
    startCountdown();
    otpRef.current?.focus();

    return () => {
      clearInterval(cooldownRef.current);
      clearInterval(countdownRef.current);
    };
  }, []);

  const startCooldown = (sec = RESEND_COOLDOWN) => {
    setCooldown(sec);
    clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((p) => {
        if (p <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
  };

  const startCountdown = (sec = OTP_TTL) => {
    setRemaining(sec);
    clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setRemaining((p) => {
        if (p <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
  };

  /* ---------- Actions ---------- */
  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setFeedback("");

    const normalized = email.trim().toLowerCase();
    if (!normalized || !otp) {
      setError("Authentication Error: Provide Email & OTP");
      return;
    }
    if (remaining <= 0) {
      setError("Security Timeout: OTP expired. Please resend.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/verify-otp", {
        email: normalized,
        otp,
      });
      if (res?.status === 200) {
        navigate(`/reset?email=${encodeURIComponent(normalized)}`);
      } else {
        setError("Authentication Failed: Invalid OTP");
      }
    } catch {
      setError("Authorization Error: Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setFeedback("");

    const normalized = email.trim().toLowerCase();
    if (!normalized.endsWith("@newhorizonindia.edu")) {
      setError("Institutional Protocol: Use college email");
      return;
    }
    if (cooldown > 0) return;

    setLoading(true);
    try {
      await api.post("/auth/resend-otp", { email: normalized });
      setFeedback("New OTP dispatched successfully.");
      startCooldown();
      startCountdown();
    } catch {
      setError("Server Error: Unable to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (sec) =>
    `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

  const percent = Math.round((remaining / OTP_TTL) * 100);

  return (
    <div
      className={`min-h-screen flex flex-col justify-center items-center px-4 relative overflow-hidden transition-colors duration-700 ${
        isDtao
          ? "bg-[#08050b]"
          : "bg-gradient-to-br from-[#f8fbff] via-[#eef8ff] to-[#e9f5ff]"
      }`}
    >
      {/* Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.4, 0.25] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute -top-24 -left-24 w-[36rem] h-[36rem] rounded-full blur-[110px] ${
            isDtao ? "bg-violet-700/20" : "bg-blue-300/25"
          }`}
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute -bottom-24 -right-24 w-[40rem] h-[40rem] rounded-full blur-[130px] ${
            isDtao ? "bg-fuchsia-600/10" : "bg-cyan-200/30"
          }`}
        />
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={SPRING}
        className={`relative z-10 w-full max-w-md rounded-[2.5rem] p-10 backdrop-blur-3xl border shadow-2xl ${
          isDtao
            ? "bg-black/40 border-violet-900/50 shadow-violet-950/20"
            : "bg-white/70 border-white/60 shadow-blue-900/5"
        }`}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.img
            whileHover={{ scale: 1.05 }}
            src="https://res.cloudinary.com/duhki4wze/image/upload/v1756755114/nhce_25-scaled-2_a6givc.png"
            alt="NHCE"
            className="w-32 mx-auto mb-6 drop-shadow-2xl"
          />
          <h1
            className={`text-3xl font-black ${
              isDtao ? "text-white" : "text-slate-800"
            }`}
          >
            Security Check
          </h1>
          <p
            className={`mt-2 text-sm ${
              isDtao ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Enter the verification code sent to your email.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          {/* Email */}
          <input
            type="email"
            value={email}
            disabled={loading}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full px-6 py-3 rounded-2xl font-bold outline-none border ${
              isDtao
                ? "bg-white/5 border-violet-800 text-white"
                : "bg-white border-slate-200"
            }`}
          />

          {/* OTP */}
          <input
            ref={otpRef}
            type="text"
            maxLength={6}
            required
            value={otp}
            disabled={loading}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className={`w-full px-6 py-4 rounded-2xl text-center text-2xl tracking-[0.6em] font-black outline-none border ${
              isDtao
                ? "bg-white/5 border-violet-800 text-violet-400"
                : "bg-slate-50 border-slate-200 text-blue-600"
            }`}
          />

          {/* Timer */}
          <div>
            <div className="flex justify-between text-xs font-black mb-2">
              <span className={remaining > 60 ? "text-slate-400" : "text-rose-500"}>
                Token Lifetime
              </span>
              <span>{formatTime(remaining)}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <motion.div
                animate={{ width: `${percent}%` }}
                transition={{ duration: 1 }}
                className={`h-full ${
                  remaining > 60
                    ? "bg-blue-500"
                    : "bg-gradient-to-r from-orange-500 to-rose-500"
                }`}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              disabled={loading || remaining <= 0}
              className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
            >
              {loading ? "Syncing..." : "Verify Identity"}
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              disabled={loading || cooldown > 0}
              onClick={handleResend}
              className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border bg-white/5 text-slate-400"
            >
              {cooldown > 0 ? `Retry in ${cooldown}s` : "Resend Code"}
            </motion.button>
          </div>

          {/* Messages */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[10px] uppercase font-black tracking-widest text-center bg-emerald-500/10 text-emerald-400 p-4 rounded-xl"
              >
                {feedback}
              </motion.div>
            )}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[10px] uppercase font-black tracking-widest text-center bg-rose-500/10 text-rose-400 p-4 rounded-xl"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>

      <footer className="mt-8 text-[10px] uppercase tracking-[0.5em] opacity-30">
        Verified Protocol © {new Date().getFullYear()} NHCE
      </footer>
    </div>
  );
}
