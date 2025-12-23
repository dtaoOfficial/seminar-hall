// src/pages/Admin/AddUserPage.js (UserRegisterPage)
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion"; // Added for Kyr smoothness
import api from "../../utils/api";
import { useTheme } from "../../contexts/ThemeContext";

// --- Eye icons (SVG) ---
const EyeOpenIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const EyeClosedIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);

const fallbackDepts = ["CSE-1", "CSE-2", "DS", "ISE", "AI&ML", "EEE", "ECE", "ME", "MBA", "MCA", "MTech"];

/* ---------- Accessible Kyr Dropdown ---------- */
function Dropdown({ options = [], value, onChange, className = "", ariaLabel = "Select", placeholder = "" }) {
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const normalized = options.map((o) => (typeof o === "string" ? { value: o, label: o } : { value: o.value, label: o.label ?? o.value }));
  const selectedLabel = (normalized.find((o) => String(o.value) === String(value)) || {}).label ?? "";

  useEffect(() => {
    function onDoc(e) {
      if (!ref.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className={`relative inline-block w-full ${className}`}>
      <motion.button
        whileTap={{ scale: 0.98 }}
        type="button"
        onClick={() => setOpen((s) => !s)}
        className={`w-full text-left rounded-2xl px-4 py-3 border transition-all flex items-center justify-between ${
          isDtao ? "bg-white/5 border-violet-500/30 text-slate-100" : "bg-white border-gray-200 text-gray-800"
        }`}
      >
        <span className={`text-sm ${selectedLabel ? "font-medium" : "opacity-40"}`}>{selectedLabel || placeholder}</span>
        <svg className={`w-4 h-4 ml-2 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
           <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className={`absolute z-[100] mt-2 w-full rounded-2xl shadow-2xl backdrop-blur-xl border ${
              isDtao ? "bg-black/90 border-violet-500/40 text-slate-100" : "bg-white border-gray-200"
            } overflow-hidden`}
          >
            <div className="max-h-60 overflow-y-auto p-1">
              {normalized.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`px-4 py-2.5 rounded-xl cursor-pointer text-sm transition-colors ${
                    String(opt.value) === String(value) 
                      ? (isDtao ? "bg-violet-600 text-white" : "bg-blue-600 text-white") 
                      : (isDtao ? "hover:bg-white/10" : "hover:bg-gray-100")
                  }`}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const UserRegisterPage = () => {
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  const [role, setRole] = useState("DEPARTMENT");
  const [department, setDepartment] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);

  const messagesRef = useRef(null);
  const suggestionsRef = useRef(null);

  // --- Functions (Kept exactly same) ---
  useEffect(() => {
    let mounted = true;
    const fetchDepts = async () => {
      try {
        try {
          const res = await api.get("/departments");
          if (!mounted) return;
          const list = (Array.isArray(res.data) ? res.data : []).map((d) => (typeof d === "string" ? d : d?.name || "")).filter(Boolean);
          if (list.length > 0) {
            setDepartments(list);
            setDepartment((prev) => (prev && list.includes(prev) ? prev : list[0]));
            return;
          }
        } catch (err) {}
        try {
          const resUsers = await api.get("/users");
          if (!mounted) return;
          const users = Array.isArray(resUsers.data) ? resUsers.data : [];
          const deptSet = new Set();
          users.forEach((u) => { if (u?.department) deptSet.add(u.department.trim()); });
          const derived = Array.from(deptSet).sort();
          if (derived.length > 0) {
            setDepartments(derived);
            setDepartment((prev) => (prev && derived.includes(prev) ? prev : derived[0]));
            return;
          }
        } catch (err) {}
        setDepartments(fallbackDepts);
        setDepartment((prev) => (prev && fallbackDepts.includes(prev) ? prev : fallbackDepts[0]));
      } catch (err) {
        setDepartments(fallbackDepts);
        setDepartment((prev) => (prev && fallbackDepts.includes(prev) ? prev : fallbackDepts[0]));
      }
    };
    fetchDepts();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!error && !success) return;
    const t = setTimeout(() => { setError(""); setSuccess(""); }, 5000);
    return () => clearTimeout(t);
  }, [error, success]);

  const isValidEmail = (mail) => /^[a-zA-Z0-9._%+-]+@newhorizonindia\.edu$/.test((mail || "").trim().toLowerCase());
  const isValidPhone = (num) => {
    if (!/^[6-9][0-9]{9}$/.test(num)) return false;
    const invalids = ["1234567890", "0987654321", "1111111111", "2222222222", "3333333333", "4444444444", "5555555555", "6666666666", "7777777777", "8888888888", "9999999999"];
    return !invalids.includes(num);
  };
  const isMediumPassword = (pwd) => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,}$/.test(pwd);

  const generateSuggestions = () => {
    const sampleWords = ["nh2025", "CseUser", "Dept", "Horizon", "Campus"];
    const symbols = ["@", "#", "$", "&", "!"];
    const arr = Array.from({ length: 3 }, () => {
      const w = sampleWords[Math.floor(Math.random() * sampleWords.length)];
      const n = Math.floor(Math.random() * 100);
      const s = symbols[Math.floor(Math.random() * symbols.length)];
      return `${w}${s}${n}`;
    });
    setSuggestions(arr);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    const nameTrim = (name || "").trim();
    const emailNorm = (email || "").trim().toLowerCase();
    const phoneTrim = (phone || "").trim();

    if (!nameTrim) { setError("Name is required"); return; }
    if (!isValidEmail(emailNorm)) { setError("Email must end with @newhorizonindia.edu"); return; }
    if (!isValidPhone(phoneTrim)) { setError("Phone must be a valid 10-digit number"); return; }
    if (!isMediumPassword(password)) { setError("Password must be 6+ chars with letters & numbers"); return; }

    const payload = { name: nameTrim, role: (role || "DEPARTMENT").toUpperCase(), department: role.toUpperCase() === "DEPARTMENT" ? department : null, email: emailNorm, phone: phoneTrim, password };

    try {
      setLoading(true);
      await api.post("/users", payload);
      setSuccess("User registered successfully!");
      setName(""); setEmail(""); setPhone(""); setPassword(""); setSuggestions([]);
    } catch (err) {
      setError(err?.response?.data?.error || err?.response?.data?.message || "Registration failed");
    } finally { setLoading(false); }
  };

  // --- UI Config ---
  const glassCard = isDtao ? "bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl" : "bg-white border-white/60 shadow-xl";
  const inputStyle = `w-full rounded-2xl px-4 py-3 border outline-none transition-all text-sm ${isDtao ? "bg-white/5 border-white/10 focus:border-violet-500 text-white" : "bg-white border-gray-100 focus:border-blue-500"}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`min-h-screen pt-4 pb-12 transition-colors duration-500 ${isDtao ? "bg-[#08050b] text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <motion.div initial={{ x: -20 }} animate={{ x: 0 }} className="mb-8">
           <h1 className="text-3xl font-bold tracking-tight">User <span className="text-blue-500">Registration</span></h1>
           <p className="text-sm opacity-60 mt-1">Create and manage institutional access accounts</p>
        </motion.div>

        {/* Main Form Card */}
        <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className={`rounded-[2.5rem] p-8 sm:p-10 border ${glassCard}`}>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-40 ml-1">Full Name</label>
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Maheswar Reddy" className={inputStyle} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-40 ml-1">Account Role</label>
                <Dropdown options={["ADMIN", "DEPARTMENT"]} value={role} onChange={setRole} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {role === "DEPARTMENT" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-40 ml-1">Department Branch</label>
                  <Dropdown options={departments.length ? departments : fallbackDepts} value={department} onChange={setDepartment} />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-40 ml-1">Institutional Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@newhorizonindia.edu" className={inputStyle} required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-40 ml-1">Phone Number</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="10 Digit Number" className={inputStyle} required />
              </div>
              <div className="space-y-1.5 relative">
                <label className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-40 ml-1">Account Password</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 characters" className={`${inputStyle} pr-12`} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 transition-opacity">
                    {showPassword ? <EyeOpenIcon className="w-5 h-5" /> : <EyeClosedIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-white/5">
              <motion.button 
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                type="submit" disabled={loading}
                className="w-full sm:flex-1 py-4 rounded-2xl font-bold text-white shadow-lg bg-gradient-to-r from-blue-600 to-cyan-500 shadow-blue-500/20 disabled:opacity-50"
              >
                {loading ? "Registering..." : "Create Account"}
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                type="button" onClick={generateSuggestions}
                className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-sm border ${isDtao ? "border-white/10 bg-white/5 text-white" : "border-gray-200 bg-slate-50 text-slate-700"}`}
              >
                Suggest Password
              </motion.button>
            </div>
          </form>

          {/* Messages & Suggestions */}
          <AnimatePresence>
            {(error || success) && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-6 pt-6 border-t border-white/5">
                {error && <div className={`p-4 rounded-2xl text-sm font-bold border ${isDtao ? "bg-rose-500/10 border-rose-500/20 text-rose-500" : "bg-rose-50 border-rose-100 text-rose-700"}`}>{error}</div>}
                {success && <div className={`p-4 rounded-2xl text-sm font-bold border ${isDtao ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-emerald-50 border-emerald-100 text-emerald-700"}`}>{success}</div>}
              </motion.div>
            )}
            
            {suggestions.length > 0 && (
              <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-6 p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 text-blue-500">Secure Recommendations</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s, i) => (
                    <button key={i} type="button" onClick={() => setPassword(s)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${isDtao ? "bg-white/5 hover:bg-blue-500 hover:text-white" : "bg-white border hover:border-blue-500 text-slate-700"}`}>{s}</button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-[10px] opacity-30 mt-8 leading-relaxed italic text-center">Note: Passwords must contain a mix of alphabets and numbers. Institutional email is mandatory for department accounts.</p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default UserRegisterPage;