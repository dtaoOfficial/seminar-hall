// src/pages/ManageOperatorsPage.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion"; // Added for Kyr smoothness
import api from "../utils/api";
import { useNotification } from "../components/NotificationsProvider";
import { useTheme } from "../contexts/ThemeContext";

export default function ManageOperatorsPage() {
  const { notify } = useNotification();
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  const [operators, setOperators] = useState([]);
  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    hallIds: [],
    hallNames: [],
    headName: "",
    headEmail: "",
    phone: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");
  const [hallFilter, setHallFilter] = useState("");
  const [page, setPage] = useState(1);
  const perPageOptions = [5, 10, 20];
  const [perPage, setPerPage] = useState(10);
  const [selectedOperator, setSelectedOperator] = useState(null);

  const mainRef = useRef(null);
  const formTopRef = useRef(null);

  /* ---------- MultiSelect Component (Kyr Smooth Version) ---------- */
  function MultiSelect({ options = [], value = [], onChange, placeholder = "Select halls" }) {
    const ref = useRef(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
      function onDoc(e) {
        if (!ref.current?.contains(e.target)) setOpen(false);
      }
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    const toggle = (v) => {
      if (value.includes(v)) onChange(value.filter((x) => x !== v));
      else onChange([...value, v]);
    };

    const selectedLabels = options.filter((o) => value.includes(o.value)).map((o) => o.label);
    const label = selectedLabels.length ? selectedLabels.join(", ") : placeholder;

    return (
      <div ref={ref} className="relative w-full">
        <motion.button
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => setOpen((s) => !s)}
          className={`w-full text-left rounded-xl px-4 py-2.5 border transition-all duration-300 flex items-center justify-between ${
            isDtao 
              ? "bg-white/5 border-violet-500/30 text-slate-100 hover:bg-white/10" 
              : "bg-white border-gray-200 text-gray-800 hover:border-blue-400"
          }`}
        >
          <span className={`truncate text-sm ${selectedLabels.length ? "font-medium" : "opacity-50"}`}>{label}</span>
          <motion.svg 
            animate={{ rotate: open ? 180 : 0 }}
            className="w-4 h-4 ml-2 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        </motion.button>

        <AnimatePresence>
          {open && (
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`absolute z-50 mt-2 w-full rounded-xl shadow-2xl backdrop-blur-xl border ${
                isDtao ? "bg-black/90 border-violet-500/40 text-slate-100" : "bg-white/95 border-gray-200 text-slate-800"
              } max-h-60 overflow-y-auto p-1`}
            >
              {options.map((opt) => {
                const checked = value.includes(opt.value);
                return (
                  <label key={opt.value} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                    isDtao ? "hover:bg-violet-600/30" : "hover:bg-blue-50"
                  }`}>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={checked} 
                      onChange={() => toggle(opt.value)} 
                    />
                    <span className={`text-sm ${checked ? "font-bold text-blue-500" : ""}`}>{opt.label}</span>
                  </label>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  /* ---------- Functions (Kept Exactly Same) ---------- */
  async function fetchOperators() {
    setLoading(true);
    try {
      const res = await api.get("/hall-operators");
      setOperators(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      notify("Failed to load operators", "error", 3000);
    } finally {
      setLoading(false);
    }
  }

  async function fetchHalls() {
    try {
      const res = await api.get("/halls");
      setHalls(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      notify("Failed to load halls", "error", 3000);
    }
  }

  useEffect(() => {
    fetchOperators();
    fetchHalls();
  }, []);

  function resetForm() {
    setForm({ hallIds: [], hallNames: [], headName: "", headEmail: "", phone: "" });
    setEditingId(null);
  }

  function validateForm() {
    if (!form.hallIds || form.hallIds.length === 0) {
      notify("Select at least one hall", "warn", 2200);
      return false;
    }
    if (!form.headName.trim() || !form.headEmail.trim()) {
      notify("Head name and email are required", "warn", 2200);
      return false;
    }
    if (form.phone) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(form.phone)) {
        notify("Phone must be 10 digits starting with 6/7/8/9", "error", 3000);
        return false;
      }
    }
    const email = (form.headEmail || "").toLowerCase();
    if (!(email.endsWith("@newhorizonindia.edu") || email.endsWith("@gmail.com"))) {
      notify("Email must be @newhorizonindia.edu or @gmail.com", "error", 3000);
      return false;
    }
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;
    const hallNames = halls.filter((h) => form.hallIds.includes(h.id)).map((h) => h.name);
    const payload = { ...form, hallNames };
    try {
      if (editingId) {
        await api.put(`/hall-operators/${editingId}`, payload);
        notify("Operator updated", "success", 2200);
      } else {
        await api.post("/hall-operators", payload);
        notify("Operator created", "success", 2200);
      }
      resetForm();
      setSelectedOperator(null);
      await fetchOperators();
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed";
      notify(String(msg), "error", 3500);
    }
  }

  function handleEdit(op) {
    const id = op.id ?? op._id;
    setEditingId(id);
    setForm({
      hallIds: op.hallIds?.length ? op.hallIds : (op.hallId ? [op.hallId] : []),
      hallNames: op.hallNames?.length ? op.hallNames : (op.hallName ? [op.hallName] : []),
      headName: op.headName || "",
      headEmail: op.headEmail || "",
      phone: op.phone || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    if (!id || !window.confirm("Delete this operator?")) return;
    try {
      await api.delete(`/hall-operators/${id}`);
      notify("Deleted", "success", 1800);
      if (selectedOperator?.id === id || selectedOperator?._id === id) setSelectedOperator(null);
      await fetchOperators();
    } catch (err) {
      notify("Failed to delete", "error", 3000);
    }
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      notify("Email copied", "success", 1400);
    } catch {
      notify("Copy failed", "error", 1800);
    }
  };

  const exportCSV = (rows) => {
    if (!rows.length) { notify("No rows to export", "info", 1800); return; }
    const headers = ["Halls", "Head", "Email", "Phone"];
    const csv = [headers.join(","), ...rows.map((r) => [`"${(r.hallNames?.join("; ") || r.hallName || "")}"`, `"${r.headName}"`, `"${r.headEmail}"`, `"${r.phone || ""}"`].join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `operators_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    notify("CSV exported", "success", 1800);
  };

  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    return operators.filter((op) => {
      const hallList = op.hallNames?.join(" ") || op.hallName || "";
      if (hallFilter && !hallList.includes(hallFilter)) return false;
      if (!q) return true;
      const hay = `${hallList} ${op.headName} ${op.headEmail}`.toLowerCase();
      return hay.includes(q);
    });
  }, [operators, query, hallFilter]);

  const total = filtered.length;
  const totalPages = Math.ceil(total / perPage) || 1;
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    // Updated pt-20 to pt-[72px] (Tight fit for 64px navbar)
    <div ref={mainRef} className={`min-h-screen pt-[72px] pb-12 px-4 transition-colors duration-500 ${isDtao ? "bg-[#08050b]" : "bg-slate-50"}`}>
      <div className="max-w-6xl mx-auto">
        
        {/* Page Header */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-8">
          <h1 className={`text-3xl font-bold tracking-tight ${isDtao ? "text-white" : "text-slate-800"}`}>
            Venue <span className="text-blue-500">Operators</span>
          </h1>
          <p className={`text-sm mt-1 opacity-60 ${isDtao ? "text-slate-400" : "text-slate-600"}`}>Manage and assign operators to specific seminar halls</p>
        </motion.div>

        {/* Form Card (Glassy) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className={`backdrop-blur-xl rounded-3xl p-6 mb-8 border shadow-2xl ${
            isDtao ? "bg-white/5 border-white/10" : "bg-white border-white/40"
          }`}
        >
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1">
              <label className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2 block">Halls Assignment</label>
              <MultiSelect
                options={halls.map((h) => ({ value: h.id, label: h.name }))}
                value={form.hallIds}
                onChange={(ids) => setForm({ ...form, hallIds: ids })}
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2 block">Head Name</label>
              <input
                placeholder="Ex: John Doe"
                value={form.headName}
                onChange={(e) => setForm({ ...form, headName: e.target.value })}
                className={`w-full rounded-xl px-4 py-2.5 border text-sm transition-all outline-none focus:ring-2 ${
                  isDtao ? "bg-white/5 border-white/10 text-white focus:ring-violet-500/50" : "bg-white border-gray-200 focus:ring-blue-500/30"
                }`}
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2 block">Head Email</label>
              <input
                placeholder="Ex: john@gmail.com"
                type="email"
                value={form.headEmail}
                onChange={(e) => setForm({ ...form, headEmail: e.target.value })}
                className={`w-full rounded-xl px-4 py-2.5 border text-sm transition-all outline-none focus:ring-2 ${
                  isDtao ? "bg-white/5 border-white/10 text-white focus:ring-violet-500/50" : "bg-white border-gray-200 focus:ring-blue-500/30"
                }`}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2 block">Phone</label>
              <div className="flex gap-2">
                <input
                  placeholder="10 Digits"
                  value={form.phone}
                  maxLength={10}
                  onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })}
                  className={`flex-1 rounded-xl px-4 py-2.5 border text-sm transition-all outline-none focus:ring-2 ${
                    isDtao ? "bg-white/5 border-white/10 text-white focus:ring-violet-500/50" : "bg-white border-gray-200 focus:ring-blue-500/30"
                  }`}
                />
                <motion.button 
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  type="submit"
                  className={`px-6 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 text-white ${
                    editingId ? "bg-blue-600" : "bg-gradient-to-r from-blue-600 to-cyan-500"
                  }`}
                >
                  {editingId ? "Update" : "Add"}
                </motion.button>
              </div>
            </div>
          </form>
          {editingId && (
            <button onClick={resetForm} className="mt-4 text-xs text-red-500 font-bold hover:underline">Cancel Editing</button>
          )}
        </motion.div>

        {/* List Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
          <input
            placeholder="Search name, hall or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`w-full md:w-80 rounded-2xl px-5 py-3 border text-sm shadow-sm outline-none ${
              isDtao ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200"
            }`}
          />
          <select
            value={hallFilter}
            onChange={(e) => setHallFilter(e.target.value)}
            className={`rounded-2xl px-4 py-3 border text-sm outline-none ${
              isDtao ? "bg-zinc-900 border-white/10 text-white" : "bg-white border-gray-200"
            }`}
          >
            <option value="">All Halls</option>
            {halls.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
          </select>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            onClick={() => exportCSV(filtered)}
            className="ml-auto bg-emerald-500 text-white px-5 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-emerald-500/20"
          >
            Export List
          </motion.button>
        </div>

        {/* Table/List Area */}
        <div className={`rounded-3xl border overflow-hidden shadow-xl backdrop-blur-md ${
          isDtao ? "bg-black/20 border-white/5" : "bg-white border-white/40"
        }`}>
          <div className="hidden sm:block">
            <table className="w-full text-left">
              <thead>
                <tr className={`border-b ${isDtao ? "border-white/10 bg-white/5" : "border-gray-100 bg-slate-50"}`}>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest opacity-60">Halls</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest opacity-60">Lead Operator</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest opacity-60">Email Address</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest opacity-60 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={4} className="py-20 text-center opacity-40">Connecting to server...</td></tr>
                ) : paged.length === 0 ? (
                  <tr><td colSpan={4} className="py-20 text-center opacity-40">No operators matching your criteria.</td></tr>
                ) : (
                  paged.map((op) => (
                    <motion.tr 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      key={op.id ?? op._id} 
                      className={`group transition-colors ${isDtao ? "hover:bg-white/5" : "hover:bg-blue-50/50"}`}
                    >
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-blue-500">{(op.hallNames?.join(", ")) || op.hallName}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold">{op.headName}</div>
                        <div className="text-xs opacity-50">{op.phone || "No phone added"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm opacity-80">{op.headEmail}</span>
                          <button onClick={() => copyToClipboard(op.headEmail)} className="opacity-0 group-hover:opacity-100 text-[10px] bg-white/10 px-2 py-1 rounded-md transition-all">Copy</button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleEdit(op)} className="p-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                          <button onClick={() => handleDelete(op.id ?? op._id)} className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Mobile version remains functionally same but styled like the table */}
          <div className="sm:hidden divide-y divide-white/10">
            {paged.map(op => (
              <div key={op.id ?? op._id} className="p-4">
                 <div className="text-sm font-bold text-blue-500">{(op.hallNames?.join(", ")) || op.hallName}</div>
                 <div className="font-bold mt-1">{op.headName}</div>
                 <div className="text-xs opacity-50">{op.headEmail}</div>
                 <div className="flex gap-2 mt-3">
                    <button onClick={() => handleEdit(op)} className="flex-1 py-2 bg-blue-500 text-white rounded-xl text-xs font-bold">Edit</button>
                    <button onClick={() => handleDelete(op.id ?? op._id)} className="flex-1 py-2 bg-red-500 text-white rounded-xl text-xs font-bold">Delete</button>
                 </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs opacity-50">Showing {paged.length} of {total} operators</p>
          <div className="flex gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 disabled:opacity-20 text-sm"
            >
              Prev
            </button>
            <button 
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 disabled:opacity-20 text-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}