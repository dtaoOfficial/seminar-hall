// src/pages/ManageOperatorsPage.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../utils/api";
import { useNotification } from "../components/NotificationsProvider";
import { useTheme } from "../contexts/ThemeContext";

/* ========================================================================== */
/* ANIMATION VARIANTS */
/* ========================================================================== */
const fastSpring = { type: "spring", stiffness: 400, damping: 30 };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: fastSpring }
};

/* ========================================================================== */
/* MULTI SELECT */
/* ========================================================================== */
function MultiSelect({ options = [], value = [], onChange, placeholder = "Select halls", isDtao }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const toggle = (v) =>
    value.includes(v) ? onChange(value.filter((x) => x !== v)) : onChange([...value, v]);

  const labels = options.filter(o => value.includes(o.value)).map(o => o.label);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full rounded-2xl px-5 py-4 border flex justify-between ${
          isDtao ? "bg-white/5 border-violet-800 text-white" : "bg-white border-slate-200"
        }`}
      >
        <span className="truncate text-sm font-bold">
          {labels.length ? labels.join(", ") : placeholder}
        </span>
        <span>▾</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`absolute z-50 w-full mt-2 rounded-2xl border shadow-xl ${
              isDtao ? "bg-slate-900 border-violet-800" : "bg-white border-slate-200"
            }`}
          >
            {options.map(opt => (
              <label key={opt.value} className="flex gap-3 px-5 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value.includes(opt.value)}
                  onChange={() => toggle(opt.value)}
                />
                <span className="text-sm font-bold">{opt.label}</span>
              </label>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ========================================================================== */
/* MAIN COMPONENT */
/* ========================================================================== */
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
    phone: ""
  });

  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");
  const [hallFilter, setHallFilter] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedOperator, setSelectedOperator] = useState(null);

/* ======================= FETCH ======================= */
  const fetchOperators = async () => {
    setLoading(true);
    try {
      const res = await api.get("/hall-operators");
      setOperators(Array.isArray(res.data) ? res.data : []);
    } catch {
      notify("Failed to load operators", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchHalls = async () => {
    try {
      const res = await api.get("/halls");
      setHalls(Array.isArray(res.data) ? res.data : []);
    } catch {
      notify("Failed to load halls", "error");
    }
  };

  useEffect(() => {
    fetchOperators();
    fetchHalls();
  }, []);

/* ======================= FORM ======================= */
  const validateForm = () => {
    if (!form.hallIds.length) return notify("Select at least one hall", "warn");
    if (!form.headName || !form.headEmail) return notify("Name and email required", "warn");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editingId) {
        await api.put(`/hall-operators/${editingId}`, form);
        notify("Operator updated successfully", "success");
      } else {
        await api.post("/hall-operators", form);
        notify("Operator added successfully", "success");
      }
      setForm({ hallIds: [], hallNames: [], headName: "", headEmail: "", phone: "" });
      setEditingId(null);
      fetchOperators();
    } catch {
      notify("Operation failed", "error");
    }
  };

  const handleEdit = (op) => {
    setEditingId(op.id || op._id);
    setForm(op);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this operator?")) return;
    try {
      await api.delete(`/hall-operators/${id}`);
      notify("Operator deleted", "success");
      fetchOperators();
    } catch {
      notify("Delete failed", "error");
    }
  };

/* ======================= FILTER ======================= */
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return operators.filter(op =>
      `${op.headName} ${op.headEmail}`.toLowerCase().includes(q)
    );
  }, [operators, query]);

  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

/* ======================= UI ======================= */
  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <motion.div variants={containerVariants} initial="hidden" animate="visible">

        <motion.h1 variants={itemVariants} className="text-4xl font-black">
          Manage Hall Operators
        </motion.h1>
        <p className="text-sm text-slate-500 mb-8">
          Assign and manage hall operators
        </p>

        {/* FORM */}
        <motion.form variants={itemVariants} onSubmit={handleSubmit} className="mb-12">
          <input
            placeholder="Operator Name"
            value={form.headName}
            onChange={e => setForm({ ...form, headName: e.target.value })}
            className="border rounded-xl px-5 py-4 mr-4"
          />
          <input
            placeholder="Operator Email"
            value={form.headEmail}
            onChange={e => setForm({ ...form, headEmail: e.target.value })}
            className="border rounded-xl px-5 py-4 mr-4"
          />
          <button className="bg-blue-600 text-white px-8 py-4 rounded-xl">
            {editingId ? "Update Operator" : "Add Operator"}
          </button>
        </motion.form>

        {/* TABLE */}
        <table className="w-full border rounded-2xl overflow-hidden">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-5 text-left">Name</th>
              <th className="p-5">Email</th>
              <th className="p-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="3" className="p-10 text-center">Loading operators...</td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan="3" className="p-10 text-center">No operators found</td></tr>
            ) : (
              paged.map(op => (
                <tr key={op._id} className="border-t">
                  <td className="p-5">{op.headName}</td>
                  <td className="p-5">{op.headEmail}</td>
                  <td className="p-5 text-right space-x-3">
                    <button onClick={() => handleEdit(op)} className="text-blue-600">Edit Operator</button>
                    <button onClick={() => handleDelete(op._id)} className="text-red-600">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

      </motion.div>
    </div>
  );
}
