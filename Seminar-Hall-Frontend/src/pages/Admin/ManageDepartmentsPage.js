// src/pages/Admin/ManageDepartmentsPage.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion"; 
import api from "../../utils/api";
import { useNotification } from "../../components/NotificationsProvider";
import { useTheme } from "../../contexts/ThemeContext";

const ManageDepartmentsPage = ({ fetchDepartmentsProp }) => {
  const { notify } = useNotification();
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // add form
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  // edit state
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // show table/cards depending on screen size
  const [showTable, setShowTable] = useState(true);
  const [showCards, setShowCards] = useState(false);

  const mainRef = useRef(null);
  const modalInputRef = useRef(null);

  // --- Logic Kept Same ---
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setShowTable(false);
        setShowCards(true);
      } else {
        setShowTable(true);
        setShowCards(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const errMsg = (err) => {
    return (
      err?.response?.data?.message ||
      (typeof err?.response?.data === "string" ? err.response.data : null) ||
      err?.response?.statusText ||
      err?.message ||
      "Unknown error"
    );
  };

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/departments");
      const arr = Array.isArray(res.data)
        ? res.data.map((d) => (typeof d === "string" ? { name: d, id: d } : d))
        : [];
      setDepartments(arr);
    } catch (err) {
      console.error("Error fetching departments:", err);
      notify(`Failed to fetch departments: ${errMsg(err)}`, "error", 3000);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleAdd = async (e) => {
    e?.preventDefault();
    const name = (newName || "").trim();
    if (!name) {
      notify("Please enter a department name", "warn", 2000);
      return;
    }
    setAdding(true);
    try {
      await api.post("/departments", { name });
      notify("Department added", "success", 2000);
      setNewName("");
      await fetchDepartments();
      if (typeof fetchDepartmentsProp === "function") fetchDepartmentsProp();
    } catch (err) {
      notify(errMsg(err) || "Failed to add department", "error", 3500);
    } finally {
      setAdding(false);
    }
  };

  // ✅ FIXED EDIT PANEL BUG: Added Scroll to Top
  const handleEditOpen = (dept) => {
    setEditing(dept);
    setEditName(dept.name || "");
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Brings user to view the modal
    setTimeout(() => {
      if (modalInputRef.current) {
        modalInputRef.current.focus({ preventScroll: true });
      }
    }, 150);
  };

  const handleEditSave = async (e) => {
    e?.preventDefault();
    if (!editing) return;
    const name = (editName || "").trim();
    if (!name) {
      notify("Please enter a department name", "warn", 2000);
      return;
    }
    setSavingEdit(true);
    try {
      const id = editing.id ?? editing._id ?? editing.name;
      await api.put(`/departments/${id}`, { name });
      notify("Department updated", "success", 2000);
      setEditing(null);
      setEditName("");
      await fetchDepartments();
      if (typeof fetchDepartmentsProp === "function") fetchDepartmentsProp();
    } catch (err) {
      notify(errMsg(err) || "Failed to update department", "error", 3500);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleEditCancel = () => {
    setEditing(null);
    setEditName("");
  };

  const handleDelete = async (dept) => {
    if (!window.confirm(`Delete "${dept.name}"?`)) return;
    try {
      const id = dept.id ?? dept._id ?? dept.name;
      await api.delete(`/departments/${id}`);
      notify("Department deleted", "success", 2000);
      await fetchDepartments();
      if (typeof fetchDepartmentsProp === "function") fetchDepartmentsProp();
    } catch (err) {
      notify(errMsg(err) || "Failed to delete department", "error", 3500);
    }
  };

  const glassCard = isDtao ? "bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl" : "bg-white/80 border-white/40 backdrop-blur-md shadow-xl";

  return (
    // FIX: Adjusted padding for tight navbar fit
    <div ref={mainRef} className={`min-h-screen pt-4 pb-12 transition-colors duration-500 ${isDtao ? "bg-[#08050b] text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className={`text-3xl font-bold tracking-tight ${isDtao ? "text-white" : "text-slate-800"}`}>
            Manage <span className="text-blue-500">Departments</span>
          </h1>
          <p className="text-sm opacity-60 mt-1">Configure and organize department credentials (MCA, MBA, etc.)</p>
        </motion.div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }}
          className={`rounded-[2rem] border overflow-hidden p-6 md:p-8 ${glassCard}`}
        >
          <form onSubmit={handleAdd} className="flex flex-col md:flex-row items-center gap-4 mb-8">
            <input
              type="text"
              placeholder="Enter department name (e.g. MCA)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={adding}
              className={`w-full md:flex-1 px-5 py-3 rounded-2xl outline-none border transition-all text-sm ${
                isDtao ? "bg-white/5 border-white/10 focus:border-violet-500 text-white" : "bg-white border-gray-100 focus:border-blue-500 shadow-inner text-slate-900"
              }`}
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={adding}
              className={`w-full md:w-auto px-8 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/20 text-white bg-gradient-to-r from-blue-600 to-cyan-500 disabled:opacity-50`}
            >
              {adding ? "Syncing..." : "Add Department"}
            </motion.button>
          </form>

          <div className={`border-t mb-8 ${isDtao ? "border-white/5" : "border-gray-100"}`} />

          {loading ? (
            <div className="py-20 text-center opacity-40 animate-pulse font-medium">Synchronizing with server...</div>
          ) : departments.length === 0 ? (
            <div className="py-20 text-center opacity-40">No departments found in records.</div>
          ) : (
            <>
              {showTable && (
                <div className="overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className={`border-b ${isDtao ? "border-white/10" : "border-slate-100"}`}>
                        <th className="px-4 py-4 text-xs font-bold uppercase tracking-widest opacity-60 w-16">#</th>
                        <th className="px-4 py-4 text-xs font-bold uppercase tracking-widest opacity-60">Department Name</th>
                        <th className="px-4 py-4 text-xs font-bold uppercase tracking-widest opacity-60 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {departments.map((d, idx) => (
                        <motion.tr 
                          key={d.id ?? d._id ?? d.name ?? idx} 
                          className={`group transition-colors ${isDtao ? "hover:bg-white/5" : "hover:bg-blue-50/50"}`}
                        >
                          <td className="px-4 py-5 text-sm font-medium opacity-40">{idx + 1}</td>
                          <td className="px-4 py-5 text-sm font-bold">{d.name}</td>
                          <td className="px-4 py-5 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleEditOpen(d)} className="p-2 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              </button>
                              <button onClick={() => handleDelete(d)} className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {showCards && (
                <div className="space-y-4">
                  {departments.map((d, idx) => (
                    <motion.div layout key={d.id ?? d._id ?? d.name ?? idx} className={`p-5 rounded-2xl border ${isDtao ? "bg-white/5 border-white/5" : "bg-slate-50 border-white"} flex items-center justify-between`}>
                      <div>
                        <div className="text-xs font-bold opacity-40 mb-1">DEPT #{idx + 1}</div>
                        <div className="text-sm font-bold">{d.name}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditOpen(d)} className="p-2 rounded-xl bg-amber-500/10 text-amber-600 font-bold text-xs">Edit</button>
                        <button onClick={() => handleDelete(d)} className="p-2 rounded-xl bg-red-500/10 text-red-600 font-bold text-xs">Delete</button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* Edit Modal (Fixed centered) */}
        <AnimatePresence>
          {editing && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => { if (!savingEdit) handleEditCancel(); }}
                className="absolute inset-0 bg-black/60 backdrop-blur-md" 
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className={`relative w-full max-w-md p-8 rounded-[2rem] border shadow-2xl ${isDtao ? "bg-[#120a1a] border-white/10 text-white" : "bg-white border-white text-slate-900"}`}
              >
                <h3 className="text-xl font-bold mb-6">Modify <span className="text-blue-500">Department</span></h3>
                <form onSubmit={handleEditSave} className="space-y-6">
                  <input
                    ref={modalInputRef}
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={savingEdit}
                    className={`w-full px-5 py-3 rounded-2xl border outline-none transition-all ${
                      isDtao ? "bg-white/5 border-white/10 focus:border-blue-500" : "bg-slate-50 border-slate-100 focus:border-blue-500 shadow-inner text-slate-900"
                    }`}
                  />
                  <div className="flex gap-3">
                    <button 
                      type="button" 
                      onClick={handleEditCancel} 
                      disabled={savingEdit}
                      className="flex-1 py-3 rounded-2xl font-bold bg-slate-500/10 text-slate-500"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={savingEdit}
                      className="flex-1 py-3 rounded-2xl font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-500 shadow-lg shadow-emerald-500/20"
                    >
                      {savingEdit ? "Updating..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ManageDepartmentsPage;