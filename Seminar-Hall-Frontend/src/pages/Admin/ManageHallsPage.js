// src/pages/Admin/ManageHallsPage.js
import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion"; // Added for smooth animations
import api from "../../utils/api";
import { useNotification } from "../../components/NotificationsProvider";
import { useTheme } from "../../contexts/ThemeContext";

const ManageHallsPage = ({ halls = [], fetchHalls }) => {
  const { notify } = useNotification();
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  const [newHall, setNewHall] = useState("");
  const [newCapacity, setNewCapacity] = useState("");
  const [editingHall, setEditingHall] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [localHalls, setLocalHalls] = useState(halls || []);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [showTable, setShowTable] = useState(true);
  const [showCards, setShowCards] = useState(false);

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

  const fetchHallsInternal = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/halls");
      const arr = Array.isArray(res?.data) ? res.data : [];
      setLocalHalls(arr);
      if (typeof fetchHalls === "function") {
        try { await fetchHalls(); } catch {}
      }
      return arr;
    } catch (err) {
      console.error("Error:", err);
      notify("Failed to fetch halls", "error", 3500);
      setLocalHalls([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchHalls, notify]);

  useEffect(() => {
    if (!halls || halls.length === 0) { fetchHallsInternal(); } 
    else { setLocalHalls(halls); }
  }, [halls, fetchHallsInternal]);

  const handleAddHall = async (e) => {
    e.preventDefault();
    if (!newHall.trim()) { notify("Hall name required", "warn", 2000); return; }
    const capacityNum = Number(newCapacity);
    if (!Number.isInteger(capacityNum) || capacityNum <= 0) {
      notify("Invalid capacity", "warn", 2000); return;
    }
    try {
      await api.post("/halls", { name: newHall.trim(), capacity: capacityNum });
      notify("Hall added", "success", 2000);
      setNewHall(""); setNewCapacity("");
      await fetchHallsInternal();
    } catch (err) {
      notify(err?.response?.data?.message || "Failed", "error", 3500);
    }
  };

  const openEdit = (hall) => {
    setEditingHall(hall.id ?? hall._id);
    setEditName(hall.name || "");
    setEditCapacity(hall.capacity != null ? String(hall.capacity) : "");
  };

  const handleEditHall = async (id) => {
    if (!editName.trim()) { notify("Name required", "warn", 2000); return; }
    const capacityNum = Number(editCapacity);
    if (!Number.isInteger(capacityNum) || capacityNum <= 0) {
      notify("Invalid capacity", "warn", 2000); return;
    }
    try {
      await api.put(`/halls/${id}`, { name: editName.trim(), capacity: capacityNum });
      notify("Updated", "success", 2000);
      setEditingHall(null); setEditName(""); setEditCapacity("");
      await fetchHallsInternal();
    } catch (err) {
      notify("Update failed", "error", 3500);
    }
  };

  const handleDeleteHall = async (id) => {
    if (!window.confirm("Delete this hall?")) return;
    try {
      await api.delete(`/halls/${id}`);
      notify("Deleted", "success", 2000);
      await fetchHallsInternal();
    } catch (err) {
      notify("Delete failed", "error", 3500);
    }
  };

  const effectiveHalls = Array.isArray(halls) && halls.length > 0 ? halls : localHalls;

  useEffect(() => {
    const anyOpen = !!editingHall || !!previewUrl;
    document.body.style.overflow = anyOpen ? "hidden" : "";
  }, [editingHall, previewUrl]);

  // --- Theme UI Config ---
  const buttonPrimary = isDtao ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:shadow-violet-500/20" : "bg-gradient-to-r from-blue-600 to-cyan-500 hover:shadow-blue-500/20";
  const glassCard = isDtao ? "bg-white/5 border-white/10 backdrop-blur-xl" : "bg-white/70 border-white/40 backdrop-blur-md shadow-xl shadow-blue-500/5";

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className={`min-h-screen pt-24 pb-12 transition-colors duration-500 ${isDtao ? "bg-[#08050b] text-slate-100" : "bg-slate-50 text-slate-900"}`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header Section */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className={`text-3xl font-bold tracking-tight ${isDtao ? "text-white" : "text-slate-800"}`}>
              Manage <span className="text-blue-500">Halls</span>
            </h1>
            <p className="text-sm opacity-60 mt-1">Configure seminar hall availability and seating capacity</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm border transition-all ${isDtao ? "border-violet-500/30 bg-violet-500/10 text-violet-300" : "border-blue-200 bg-blue-50 text-blue-600"}`}
            onClick={fetchHallsInternal}
          >
            Refresh Data
          </motion.button>
        </div>

        {/* Add Hall Form (Glass Layout) */}
        <motion.form 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onSubmit={handleAddHall} 
          className={`p-6 rounded-3xl border ${glassCard} flex flex-col sm:flex-row gap-4 items-center`}
        >
          <div className="flex-1 w-full">
            <label className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-1.5 block px-1">Hall Name</label>
            <input
              type="text"
              placeholder="Ex: APJ Abdul Kalam Hall"
              value={newHall}
              onChange={(e) => setNewHall(e.target.value)}
              className={`w-full px-4 py-3 rounded-2xl outline-none border transition-all text-sm ${isDtao ? "bg-white/5 border-white/10 focus:border-violet-500 text-white" : "bg-white border-gray-100 focus:border-blue-500"}`}
            />
          </div>
          <div className="w-full sm:w-32">
            <label className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-1.5 block px-1">Capacity</label>
            <input
              type="number"
              min="1"
              placeholder="000"
              value={newCapacity}
              onChange={(e) => setNewCapacity(e.target.value)}
              className={`w-full px-4 py-3 rounded-2xl outline-none border transition-all text-sm ${isDtao ? "bg-white/5 border-white/10 focus:border-violet-500 text-white" : "bg-white border-gray-100 focus:border-blue-500"}`}
            />
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit" 
            className={`w-full sm:w-auto mt-4 sm:mt-5 px-8 py-3 rounded-2xl font-bold text-white shadow-lg transition-all ${buttonPrimary}`}
          >
            Add Hall
          </motion.button>
        </motion.form>

        {/* Table View (Desktop) */}
        <AnimatePresence>
          {showTable && !loading && effectiveHalls.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`rounded-3xl border overflow-hidden ${glassCard}`}
            >
              <table className="w-full text-left">
                <thead>
                  <tr className={`border-b ${isDtao ? "border-white/10 bg-white/5" : "border-slate-100 bg-slate-50/50"}`}>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest opacity-60">Seminar Hall Name</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest opacity-60">Max Seating</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest opacity-60 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {effectiveHalls.map((hall) => (
                    <motion.tr 
                      key={hall.id ?? hall._id} 
                      className={`group transition-colors ${isDtao ? "hover:bg-white/5" : "hover:bg-blue-50/50"}`}
                    >
                      <td className="px-6 py-4 font-semibold">{hall.name}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold">
                          {hall.capacity || "—"} seats
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => openEdit(hall)} className="p-2 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                        <button onClick={() => handleDeleteHall(hall.id ?? hall._id)} className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile View (Cards) */}
        {showCards && !loading && (
          <div className="grid grid-cols-1 gap-4">
            {effectiveHalls.map((hall) => (
              <motion.div 
                layout
                key={hall.id ?? hall._id} 
                className={`p-5 rounded-3xl border ${glassCard} space-y-4`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{hall.name}</h3>
                    <p className="text-xs opacity-50 font-medium">Capacity: {hall.capacity ?? "—"} Pax</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(hall)} className="p-2 rounded-xl bg-amber-500/10 text-amber-600">Edit</button>
                    <button onClick={() => handleDeleteHall(hall.id ?? hall._id)} className="p-2 rounded-xl bg-red-500/10 text-red-600">Delete</button>
                  </div>
                </div>
                {hall.photos?.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {hall.photos.map((p, i) => (
                      <img key={i} src={p} onClick={() => setPreviewUrl(p)} className="w-20 h-20 rounded-2xl object-cover border border-white/10 cursor-pointer" alt="hall" />
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Status Messages */}
        {loading && <div className="py-20 text-center opacity-40 animate-pulse">Synchronizing halls...</div>}
        {!loading && effectiveHalls.length === 0 && <div className="py-20 text-center opacity-40">No halls found in the database.</div>}

        {/* Edit Modal (Kyr Style) */}
        <AnimatePresence>
          {editingHall && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setEditingHall(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-md" 
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className={`relative w-full max-w-md p-8 rounded-[2rem] border shadow-2xl ${isDtao ? "bg-[#120a1a] border-white/10" : "bg-white border-white"}`}
              >
                <h3 className="text-xl font-bold mb-6">Modify Venue Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold opacity-50 ml-1">Venue Name</label>
                    <input className={`w-full px-4 py-3 rounded-2xl border outline-none mt-1 ${isDtao ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-100"}`} value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-bold opacity-50 ml-1">Seating Capacity</label>
                    <input type="number" className={`w-full px-4 py-3 rounded-2xl border outline-none mt-1 ${isDtao ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-100"}`} value={editCapacity} onChange={(e) => setEditCapacity(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-3 mt-8">
                  <button onClick={() => setEditingHall(null)} className="flex-1 py-3 rounded-2xl font-bold bg-slate-500/10 text-slate-500">Cancel</button>
                  <button onClick={() => handleEditHall(editingHall)} className={`flex-1 py-3 rounded-2xl font-bold text-white ${buttonPrimary}`}>Save Changes</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Photo Preview (Kyr Style) */}
        <AnimatePresence>
          {previewUrl && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl"
              onClick={() => setPreviewUrl(null)}
            >
              <motion.img 
                initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                src={previewUrl} className="max-h-[85vh] max-w-full rounded-3xl shadow-2xl border-4 border-white/10" 
              />
              <button className="absolute top-6 right-6 text-white text-3xl opacity-50 hover:opacity-100">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.div>
  );
};

export default ManageHallsPage;