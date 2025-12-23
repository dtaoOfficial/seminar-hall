// src/pages/AllDepartmentsPage.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion"; // Added for Kyr smoothness
import api from "../../utils/api";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../../components/NotificationsProvider";
import { useTheme } from "../../contexts/ThemeContext";

const MIN_PASSWORD_LENGTH = 6;
const fallbackDepts = ["CSE-1", "CSE-2", "ISE", "DS", "AI&ML", "EEE", "ECE", "ME", "MCA", "MBA"];

/* ---------- Accessible Kyr Dropdown ---------- */
function Dropdown({ options = [], value, onChange, placeholder = "Select" }) {
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";
  const ref = useRef(null);
  const [open, setOpen] = useState(false);

  const normalized = (options || []).map((o) =>
    typeof o === "string" ? { value: o, label: o } : { value: o.value, label: o.label ?? o.value }
  );

  useEffect(() => {
    function onDoc(e) {
      if (!ref.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selected = normalized.find((o) => String(o.value) === String(value));
  const selectedLabel = selected ? selected.label : "";

  return (
    <div ref={ref} className="relative inline-block w-full">
      <motion.button
        whileTap={{ scale: 0.98 }}
        type="button"
        onClick={() => setOpen((s) => !s)}
        className={`w-full text-left rounded-xl px-4 py-2.5 border transition-all flex items-center justify-between ${
          isDtao ? "bg-white/5 border-violet-500/30 text-slate-100" : "bg-white border-gray-200 text-gray-800"
        }`}
      >
        <span className={`text-sm ${selectedLabel ? "font-medium" : "opacity-50"}`}>{selectedLabel || placeholder}</span>
        <svg className={`w-4 h-4 ml-2 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
           <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className={`absolute z-[100] mt-2 w-full rounded-xl shadow-2xl backdrop-blur-xl border ${
              isDtao ? "bg-black/90 border-violet-500/40 text-slate-100" : "bg-white border-gray-200"
            } overflow-hidden`}
          >
            <div className="max-h-60 overflow-y-auto p-1">
              {normalized.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`px-4 py-2.5 rounded-lg cursor-pointer text-sm transition-colors ${
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

/* ---------- Page component ---------- */
const AllDepartmentsPage = () => {
  const { notify } = useNotification();
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [searchDept, setSearchDept] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", role: "DEPARTMENT", department: "", phone: "", password: "" });

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // --- Functions Kept Exactly Same ---
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/users");
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.clear();
        navigate("/", { replace: true });
        return;
      }
      notify("Failed to load users", "error", 3000);
    } finally { setLoading(false); }
  }, [navigate, notify]);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await api.get("/departments");
      const arr = Array.isArray(res.data) ? res.data : [];
      setDepartments(arr.map((d) => (typeof d === "string" ? d : d.name || "")).filter(Boolean));
    } catch (err) { setDepartments(fallbackDepts); }
  }, []);

  useEffect(() => { fetchUsers(); fetchDepartments(); }, [fetchUsers, fetchDepartments]);

  useEffect(() => {
    const locked = !!editingUser || resetModalOpen;
    document.body.style.overflow = locked ? "hidden" : "";
  }, [editingUser, resetModalOpen]);

  const filteredUsers = users.filter((u) => {
    const matchDept = searchDept ? (u.department || "").toLowerCase().includes(searchDept.toLowerCase()) : true;
    const matchEmail = searchEmail ? (u.email || "").toLowerCase().includes(searchEmail.toLowerCase()) : true;
    return matchDept && matchEmail;
  });

  const startEdit = (u) => {
    setEditingUser(u);
    setForm({ name: u.name || "", email: u.email || "", role: (u.role || "DEPARTMENT").toUpperCase(), department: u.department || departments[0] || "", phone: u.phone || "", password: "" });
  };

  const cancelEdit = () => { setEditingUser(null); };

  const saveEdit = async () => {
    if (!editingUser) return;
    const id = editingUser.id || editingUser._id;
    try {
      const payload = { name: form.name, email: form.email, role: form.role, department: form.department, phone: form.phone };
      if (form.password?.trim()) payload.password = form.password;
      const res = await api.put(`/users/${id}`, payload);
      const updatedUser = res.data && typeof res.data === "object" ? res.data : { ...editingUser, ...payload };
      setUsers((prev) => prev.map((u) => ((u.id === id || u._id === id) ? { ...u, ...updatedUser } : u)));
      notify("User updated", "success", 2000);
      cancelEdit();
    } catch (err) { notify("Failed to update user", "error", 3500); }
  };

  const handleDelete = async (u) => {
    const id = u.id || u._id;
    if (!window.confirm(`Delete user ${u.email}?`)) return;
    try {
      await api.delete(`/users/${id}`);
      setUsers((prev) => prev.filter((x) => (x.id || x._id) !== id));
      notify("User deleted", "success", 2000);
    } catch (err) { notify("Failed to delete user", "error", 3000); }
  };

  const openResetModal = (u) => {
    setResetUser(u);
    setNewPassword("");
    setResetModalOpen(true);
  };

  const resetPassword = async () => {
    if (!resetUser) return;
    const id = resetUser.id || resetUser._id;
    if (!newPassword || newPassword.trim().length < MIN_PASSWORD_LENGTH) {
      notify(`Min ${MIN_PASSWORD_LENGTH} characters`, "warn", 3000);
      return;
    }
    setResetSubmitting(true);
    try {
      await api.put(`/users/${id}`, { password: newPassword });
      notify("Password updated", "success", 2000);
      setResetModalOpen(false);
    } catch (err) { notify("Failed to reset", "error", 3500); }
    finally { setResetSubmitting(false); }
  };

  const glassCard = isDtao ? "bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl" : "bg-white/80 border-white/40 backdrop-blur-md shadow-xl shadow-blue-500/5";

  return (
    // FIX: Changed pt-8 to pt-4 to remove extra top space
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`min-h-screen pt-4 pb-12 transition-colors duration-500 ${isDtao ? "bg-[#08050b] text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header Section */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System <span className="text-blue-500">Credentials</span></h1>
            <p className="text-sm opacity-60 mt-1">Manage administrative and departmental access accounts</p>
          </div>
          
          {/* Filters (Glass style) */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input 
              type="text" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} placeholder="Search email..." 
              className={`w-full sm:w-64 px-4 py-2.5 rounded-xl border outline-none transition-all ${isDtao ? "bg-white/5 border-white/10 focus:border-violet-500" : "bg-white border-gray-200 focus:border-blue-500"}`} 
            />
            <input 
              type="text" value={searchDept} onChange={(e) => setSearchDept(e.target.value)} placeholder="Dept filter..." 
              className={`w-full sm:w-48 px-4 py-2.5 rounded-xl border outline-none transition-all ${isDtao ? "bg-white/5 border-white/10 focus:border-violet-500" : "bg-white border-gray-200 focus:border-blue-500"}`} 
            />
            <motion.button whileHover={{ scale: 1.05 }} onClick={fetchUsers} className={`px-5 py-2.5 rounded-xl font-bold text-sm text-white ${isDtao ? "bg-violet-600" : "bg-blue-600"}`}>
               {loading ? "..." : "Refresh"}
            </motion.button>
          </div>
        </motion.div>

        {/* User Table (Desktop) */}
        <motion.div layout className={`rounded-[2.5rem] border overflow-hidden ${glassCard}`}>
          <div className="hidden md:block w-full overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className={`border-b ${isDtao ? "border-white/10 bg-white/5" : "border-slate-100 bg-slate-50/50"}`}>
                  {["Name", "Email", "Department", "Role", "Phone", "Actions"].map((h, i) => (
                    <th key={i} className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest opacity-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence>
                  {filteredUsers.map((u) => (
                    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={u.id || u._id} className={`group transition-colors ${isDtao ? "hover:bg-white/5" : "hover:bg-blue-50/50"}`}>
                      <td className="px-6 py-5 text-sm font-bold">{u.name}</td>
                      <td className="px-6 py-5 text-sm opacity-70">{u.email}</td>
                      <td className="px-6 py-5"><span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold">{u.department || "GLOBAL"}</span></td>
                      <td className="px-6 py-5 text-[10px] font-black opacity-40">{(u.role || "DEPT").toUpperCase()}</td>
                      <td className="px-6 py-5 text-xs opacity-60">{u.phone || "—"}</td>
                      <td className="px-6 py-5 text-right whitespace-nowrap">
                        <div className="flex gap-2 justify-end">
                           <button onClick={() => startEdit(u)} className="p-2 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                           <button onClick={() => openResetModal(u)} className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" strokeWidth="2"/></svg></button>
                           <button onClick={() => handleDelete(u)} className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Mobile Grid */}
          <div className="md:hidden divide-y divide-white/10">
            {filteredUsers.map((u) => (
              <div key={u.id || u._id} className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                   <div className="min-w-0">
                      <div className="font-bold truncate">{u.name}</div>
                      <div className="text-xs opacity-50 truncate">{u.email}</div>
                   </div>
                   <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-500 text-[9px] font-bold uppercase">{u.department || "Admin"}</span>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => startEdit(u)} className="flex-1 py-2 bg-amber-500/10 text-amber-600 rounded-xl text-xs font-bold">Edit</button>
                   <button onClick={() => openResetModal(u)} className="flex-1 py-2 bg-indigo-500/10 text-indigo-600 rounded-xl text-xs font-bold">Reset</button>
                   <button onClick={() => handleDelete(u)} className="p-2 bg-red-500/10 text-red-600 rounded-xl"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6" strokeWidth="2"/></svg></button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Modals Logic Kept Identical, UI Updated */}
        <AnimatePresence>
          {editingUser && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={cancelEdit} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }} className={`relative w-full max-w-2xl p-8 rounded-[3rem] border ${isDtao ? "bg-[#120a1a] border-white/10" : "bg-white"}`}>
                <h3 className="text-xl font-bold mb-6">Modify <span className="text-blue-500">User Access</span></h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-[10px] font-bold uppercase opacity-40 ml-1">Full Name</label><input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className={`w-full px-4 py-3 rounded-2xl border outline-none ${isDtao ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-100"}`} /></div>
                  <div className="space-y-1"><label className="text-[10px] font-bold uppercase opacity-40 ml-1">Email</label><input value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className={`w-full px-4 py-3 rounded-2xl border outline-none ${isDtao ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-100"}`} /></div>
                  <div className="space-y-1"><label className="text-[10px] font-bold uppercase opacity-40 ml-1">Account Role</label><Dropdown options={["ADMIN", "DEPARTMENT"]} value={form.role} onChange={(v) => setForm({...form, role: v})} /></div>
                  {form.role === "DEPARTMENT" && <div className="space-y-1"><label className="text-[10px] font-bold uppercase opacity-40 ml-1">Dept Branch</label><Dropdown options={departments} value={form.department} onChange={(v) => setForm({...form, department: v})} /></div>}
                  <div className="space-y-1"><label className="text-[10px] font-bold uppercase opacity-40 ml-1">Phone</label><input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className={`w-full px-4 py-3 rounded-2xl border outline-none ${isDtao ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-100"}`} /></div>
                  <div className="space-y-1"><label className="text-[10px] font-bold uppercase opacity-40 ml-1">Set Password</label><input type="password" placeholder="Leave empty to keep current" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} className={`w-full px-4 py-3 rounded-2xl border outline-none ${isDtao ? "bg-white/5 border-white/10 text-violet-300" : "bg-slate-50 border-slate-100"}`} /></div>
                </div>
                <div className="mt-8 flex gap-3"><button onClick={cancelEdit} className="flex-1 py-4 rounded-2xl font-bold bg-slate-500/10 text-slate-500">Cancel</button><button onClick={saveEdit} className="flex-1 py-4 rounded-2xl font-bold bg-blue-600 text-white shadow-lg shadow-blue-600/20">Save Profile</button></div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {resetModalOpen && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setResetModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className={`relative w-full max-w-md p-8 rounded-[2.5rem] border ${isDtao ? "bg-[#120a1a] border-white/10" : "bg-white"}`}>
                <h3 className="text-xl font-bold mb-2">Reset <span className="text-indigo-500">Security</span></h3>
                <p className="text-xs opacity-50 mb-6 font-medium">Updating credentials for {resetUser?.email}</p>
                <input type="password" placeholder="New Password (min 6 chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={`w-full px-5 py-4 rounded-2xl border outline-none mb-6 ${isDtao ? "bg-white/5 border-white/10 text-violet-300" : "bg-slate-50 border-slate-100"}`} />
                <div className="flex gap-3"><button onClick={() => setResetModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold bg-slate-500/10 text-slate-500">Close</button><button onClick={resetPassword} disabled={resetSubmitting} className="flex-1 py-3 rounded-xl font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">{resetSubmitting ? "Updating..." : "Confirm"}</button></div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default AllDepartmentsPage;