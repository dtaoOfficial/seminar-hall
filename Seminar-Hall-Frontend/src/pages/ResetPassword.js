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

export default function ResetPassword() {
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  const query = useQuery();
  const navigate = useNavigate();
  const email = query.get("email") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const newPassRef = useRef(null);

  useEffect(() => {
    newPassRef.current?.focus();
  }, []);

  /* ---------- Password Strength ---------- */
  const getPasswordStrength = (pass) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/\d/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = getPasswordStrength(newPassword);

  const strengthMeta = () => {
    if (strength <= 2)
      return { label: "Weak", bar: "bg-rose-500", text: "text-rose-500" };
    if (strength <= 4)
      return { label: "Good", bar: "bg-amber-500", text: "text-amber-500" };
    return { label: "Strong", bar: "bg-emerald-500", text: "text-emerald-500" };
  };

  /* ---------- Submit ---------- */
  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    setFeedback("");

    if (!newPassword || newPassword.length < 6) {
      setError("Protocol Error: Minimum 6 characters required.");
      return;
    }
    if (newPassword !== confirm) {
      setError("Logic Error: Passwords do not match.");
      return;
    }
    if (!email) {
      setError("Identity Missing: Restart from Forgot Password.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/reset-password", {
        email: email.trim().toLowerCase(),
        newPassword,
      });

      if (res?.status === 200) {
        setFeedback("Security Updated: Password synchronized successfully.");
        setTimeout(() => navigate("/"), 1500);
      } else {
        setError("Update Denied: Server synchronization failed.");
      }
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          "System Error: Unable to update records."
      );
    } finally {
      setLoading(false);
    }
  };

  const meta = strengthMeta();

  return (
    <div
      className={`min-h-screen flex flex-col justify-center items-center px-4 relative overflow-hidden transition-colors duration-700 ${
        isDtao
          ? "bg-[#08050b]"
          : "bg-gradient-to-br from-[#f8fbff] via-[#edf6ff] to-[#e9f5ff]"
      }`}
    >
      {/* Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.25, 0.4, 0.25] }}
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
            Secure Reset
          </h1>
          <p
            className={`mt-2 text-sm ${
              isDtao ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Configure new credentials for:
            <br />
            <span className="font-black text-blue-500 break-all">
              {email || "Unknown User"}
            </span>
          </p>
        </div>

        <form onSubmit={handleReset} className="space-y-6">
          {/* New Password */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              New Access Key
            </label>
            <div className="relative mt-2">
              <input
                ref={newPassRef}
                type={showNew ? "text" : "password"}
                value={newPassword}
                disabled={loading}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`w-full px-6 py-4 rounded-2xl font-bold outline-none border ${
                  isDtao
                    ? "bg-white/5 border-violet-800 text-white"
                    : "bg-white border-slate-200"
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black uppercase tracking-widest text-blue-500"
              >
                {showNew ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Confirm */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Verify Access Key
            </label>
            <div className="relative mt-2">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirm}
                disabled={loading}
                onChange={(e) => setConfirm(e.target.value)}
                className={`w-full px-6 py-4 rounded-2xl font-bold outline-none border ${
                  isDtao
                    ? "bg-white/5 border-violet-800 text-white"
                    : "bg-white border-slate-200"
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black uppercase tracking-widest text-blue-500"
              >
                {showConfirm ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Strength */}
          <div>
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
              <span className="text-slate-500">Security Rating</span>
              <span className={meta.text}>
                {newPassword ? meta.label : "Awaiting Input"}
              </span>
            </div>
            <div className="flex gap-1 h-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scaleX: strength >= i ? 1 : 0 }}
                  className={`flex-1 rounded-full ${
                    strength >= i ? meta.bar : "bg-transparent"
                  }`}
                />
              ))}
            </div>
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

          {/* Actions */}
          <div className="space-y-4 pt-4">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              disabled={loading}
              className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
            >
              {loading ? "Securing..." : "Commit Credentials"}
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              onClick={() => navigate("/")}
              className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border bg-white/5 text-slate-400"
            >
              Abort & Return
            </motion.button>
          </div>
        </form>
      </motion.div>

      <footer className="mt-10 text-[10px] uppercase tracking-[0.5em] opacity-30">
        Credential Protocol © {new Date().getFullYear()} NHCE Engineering
      </footer>
    </div>
  );
}
