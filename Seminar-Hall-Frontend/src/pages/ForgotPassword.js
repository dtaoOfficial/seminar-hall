import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../utils/api";
import { useTheme } from "../contexts/ThemeContext";

export default function ForgotPassword() {
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSend = async (e) => {
    e.preventDefault();
    setError("");
    setFeedback("");

    const normalized = email.trim().toLowerCase();

    if (!normalized) {
      setError("Identification required: Enter your college email");
      return;
    }
    if (!normalized.endsWith("@newhorizonindia.edu")) {
      setError("Institutional Access Only: Use @newhorizonindia.edu email");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email: normalized });
      if (res?.status === 200) {
        setFeedback("Authentication Key Sent. Check your inbox for OTP.");
        setTimeout(
          () => navigate(`/verify?email=${encodeURIComponent(normalized)}`),
          1200
        );
      } else {
        setError("System synchronization failed. Try again.");
      }
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Internal server connection failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col justify-center items-center relative overflow-hidden px-4 transition-colors duration-700 ${
        isDtao
          ? "bg-[#08050b]"
          : "bg-gradient-to-br from-[#f8fbff] via-[#edf6ff] to-[#e9f5ff]"
      }`}
    >
      {/* Ambient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.4, 0.25] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute -top-24 -left-24 w-[36rem] h-[36rem] rounded-full blur-[120px] ${
            isDtao ? "bg-violet-700/20" : "bg-blue-300/30"
          }`}
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute -bottom-24 -right-24 w-[40rem] h-[40rem] rounded-full blur-[140px] ${
            isDtao ? "bg-fuchsia-600/10" : "bg-cyan-200/40"
          }`}
        />
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 26 }}
        className={`relative z-10 w-full max-w-md rounded-[2.5rem] p-10 backdrop-blur-3xl border shadow-2xl ${
          isDtao
            ? "bg-black/40 border-violet-900/50 shadow-violet-950/20"
            : "bg-white/70 border-white/60 shadow-blue-900/5"
        }`}
      >
        {/* Header */}
        <div className="text-center mb-10">
          <motion.img
            whileHover={{ rotate: [0, -4, 4, 0] }}
            transition={{ duration: 0.5 }}
            src="https://res.cloudinary.com/duhki4wze/image/upload/v1756755114/nhce_25-scaled-2_a6givc.png"
            alt="NHCE"
            className="w-32 mx-auto mb-8 drop-shadow-2xl"
          />
          <h1
            className={`text-3xl font-black tracking-tight ${
              isDtao ? "text-white" : "text-slate-800"
            }`}
          >
            Account Recovery
          </h1>
          <p
            className={`mt-3 text-sm ${
              isDtao ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Verify institutional identity to reset access.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSend} className="space-y-6">
          <div>
            <label
              className={`text-[10px] uppercase tracking-[0.25em] font-black ${
                isDtao ? "text-violet-400" : "text-slate-500"
              }`}
            >
              Registered Email
            </label>
            <input
              type="email"
              value={email}
              autoComplete="email"
              disabled={loading}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@newhorizonindia.edu"
              className={`mt-2 w-full px-6 py-4 rounded-2xl font-bold outline-none transition-all focus:scale-[1.01] focus:shadow-lg ${
                isDtao
                  ? "bg-white/5 border border-violet-800 text-white focus:border-violet-400 focus:shadow-violet-500/20"
                  : "bg-white border border-slate-200 focus:border-blue-500 focus:shadow-blue-500/20"
              }`}
              required
            />
          </div>

          {/* Messages */}
          <AnimatePresence mode="wait">
            {feedback && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={`text-[11px] uppercase tracking-widest font-black p-4 rounded-xl text-center border ${
                  isDtao
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-emerald-50 border-emerald-100 text-emerald-700"
                }`}
              >
                {feedback}
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={`text-[11px] uppercase tracking-widest font-black p-4 rounded-xl text-center border ${
                  isDtao
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                    : "bg-rose-50 border-rose-100 text-rose-700"
                }`}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="pt-4 space-y-4">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl transition-all ${
                isDtao
                  ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-violet-950/40"
                  : "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-blue-500/30"
              }`}
            >
              {loading ? "Authorizing..." : "Initiate Recovery"}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              disabled={loading}
              onClick={() => navigate("/")}
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border transition-all ${
                isDtao
                  ? "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:text-blue-600"
              }`}
            >
              Back to Login
            </motion.button>
          </div>
        </form>

        {isDtao && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-[60px]" />
        )}
      </motion.div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 1 }}
        className={`mt-10 text-[10px] uppercase tracking-[0.5em] font-black ${
          isDtao ? "text-slate-500" : "text-slate-400"
        }`}
      >
        System Protocol © {new Date().getFullYear()} NHCE Engineering
      </motion.footer>
    </div>
  );
}
