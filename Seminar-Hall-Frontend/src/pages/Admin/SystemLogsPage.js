// src/pages/Admin/SystemLogsPage.js
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CSVLink } from "react-csv";
import api from "../../utils/api";
import { useTheme } from "../../contexts/ThemeContext";

const SystemLogsPage = () => {
  const { theme } = useTheme() || {};
  const isDtao = theme === "dtao";

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");
  const [expandedRows, setExpandedRows] = useState(new Set());

  // ✅ Responsive Check
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await api.get("/logs");
      if (Array.isArray(res.data)) {
        setLogs(res.data);
      }
    } catch (error) {
      console.error("Failed to load logs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleRow = (id) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      (log.actorEmail || "").toLowerCase().includes(search.toLowerCase()) ||
      (log.action || "").toLowerCase().includes(search.toLowerCase()) ||
      (log.ipAddress || "").includes(search);
    const matchesRole = filterRole === "ALL" || (log.actorRole || "") === filterRole;
    return matchesSearch && matchesRole;
  });

  const getActionStyle = (action) => {
    if (action.includes("DELETE") || action.includes("REJECT") || action.includes("FAIL")) return "text-rose-500 bg-rose-500/10 border-rose-500/20";
    if (action.includes("APPROVE") || action.includes("CREATE")) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (action.includes("LOGIN")) return "text-blue-500 bg-blue-500/10 border-blue-500/20";
    if (action.includes("UPDATE")) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    return "text-slate-500 bg-slate-500/10 border-slate-500/20";
  };

  const formatDate = (iso) => {
    if (!iso) return "--";
    return new Date(iso).toLocaleString("en-IN", { 
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  return (
    <div className={`min-h-screen pt-6 pb-12 transition-colors duration-500 ${isDtao ? "text-slate-100" : "text-slate-900"}`}>
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">System <span className="text-blue-500">Audit Logs</span></h1>
            <p className="text-sm opacity-60 mt-1">Real-time tracking of all security events.</p>
          </div>
          <div className="flex gap-3">
             <CSVLink 
               data={filteredLogs} 
               filename={`system_logs_${new Date().toISOString()}.csv`}
               className="px-6 py-3 rounded-2xl font-bold text-xs bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:scale-105 transition-transform"
             >
               Export CSV
             </CSVLink>
          </div>
        </div>

        {/* Filters */}
        <div className={`p-4 rounded-[2rem] border grid grid-cols-1 md:grid-cols-3 gap-4 ${isDtao ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}>
          <div className="md:col-span-2">
            <input 
              type="text" 
              placeholder="Search..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full px-5 py-3 rounded-2xl border outline-none font-medium text-sm ${isDtao ? "bg-black/30 border-white/10 text-white" : "bg-slate-50 border-gray-200 text-black"}`}
            />
          </div>
          <select 
            value={filterRole} 
            onChange={(e) => setFilterRole(e.target.value)}
            className={`px-5 py-3 rounded-2xl border outline-none font-bold text-sm ${isDtao ? "bg-black/30 border-white/10 text-white" : "bg-slate-50 border-gray-200 text-black"}`}
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="DEPT">Department</option>
            <option value="SYSTEM">System</option>
          </select>
        </div>

        {/* Logs Container */}
        <motion.div layout className={`rounded-[2.5rem] border overflow-hidden shadow-2xl ${isDtao ? "bg-black/40 border-violet-900/30 backdrop-blur-xl" : "bg-white border-gray-100"}`}>
          {loading ? (
             <div className="text-center py-20 opacity-50 animate-pulse">Loading Audit Trail...</div>
          ) : filteredLogs.length === 0 ? (
             <div className="text-center py-20 opacity-50">No logs found matching criteria.</div>
          ) : (
            <>
              {/* --- DESKTOP VIEW (Table) --- */}
              {!isMobile && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className={`border-b text-[10px] uppercase tracking-widest font-black ${isDtao ? "border-white/10 text-slate-400" : "border-slate-100 text-slate-500"}`}>
                        <th className="px-6 py-5">Timestamp</th>
                        <th className="px-6 py-5">Actor</th>
                        <th className="px-6 py-5">Role</th>
                        <th className="px-6 py-5">Action</th>
                        <th className="px-6 py-5">IP Address</th>
                        <th className="px-6 py-5">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredLogs.map((log) => {
                        const isExpanded = expandedRows.has(log.id);
                        const detailsText = log.details || "No details";
                        const isLong = detailsText.length > 50;
                        return (
                          <tr key={log.id} className={`transition-colors ${isDtao ? "hover:bg-white/5" : "hover:bg-slate-50"}`}>
                            <td className="px-6 py-4 text-xs font-mono opacity-70 whitespace-nowrap align-top">{formatDate(log.timestamp)}</td>
                            {/* Fixed breaking issue by removing break-all and using min-width */}
                            <td className="px-6 py-4 text-sm font-bold align-top min-w-[140px]">
                              {log.actorEmail || "Unknown"}
                            </td>
                            <td className="px-6 py-4 align-top">
                              <span className={`text-[9px] font-black px-2 py-1 rounded-md border ${log.actorRole === 'ADMIN' ? 'border-purple-500 text-purple-500' : 'border-slate-500 text-slate-500'}`}>{log.actorRole}</span>
                            </td>
                            <td className="px-6 py-4 align-top">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider border ${getActionStyle(log.action)}`}>{log.action}</span>
                            </td>
                            <td className="px-6 py-4 text-xs font-mono opacity-60 align-top">{log.ipAddress}</td>
                            <td className="px-6 py-4 text-xs opacity-80 align-top min-w-[220px]">
                              <div className="whitespace-pre-wrap">{isExpanded ? detailsText : (isLong ? `${detailsText.slice(0, 50)}...` : detailsText)}</div>
                              {isLong && <button onClick={() => toggleRow(log.id)} className="mt-1 text-[10px] font-bold text-blue-500 hover:underline uppercase tracking-wider">{isExpanded ? "Show Less" : "More"}</button>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* --- MOBILE VIEW (Cards) --- */}
              {isMobile && (
                <div className="p-4 space-y-4">
                  {filteredLogs.map((log) => {
                    const isExpanded = expandedRows.has(log.id);
                    const detailsText = log.details || "No details";
                    const isLong = detailsText.length > 60;
                    return (
                      <div key={log.id} className={`p-5 rounded-2xl border ${isDtao ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}>
                        <div className="flex justify-between items-start mb-3">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider border ${getActionStyle(log.action)}`}>{log.action}</span>
                          <span className={`text-[9px] font-black px-2 py-1 rounded-md border ${log.actorRole === 'ADMIN' ? 'border-purple-500 text-purple-500' : 'border-slate-500 text-slate-500'}`}>{log.actorRole}</span>
                        </div>
                        
                        <div className="mb-3">
                          <div className="text-[10px] opacity-50 uppercase tracking-widest font-bold">Actor</div>
                          <div className="text-sm font-bold truncate">{log.actorEmail || "Unknown"}</div>
                        </div>

                        <div className="mb-3 bg-black/5 dark:bg-white/5 p-3 rounded-xl">
                          <div className="text-[10px] opacity-50 uppercase tracking-widest font-bold mb-1">Details</div>
                          <div className="text-xs opacity-80 whitespace-pre-wrap">
                            {isExpanded ? detailsText : (isLong ? `${detailsText.slice(0, 60)}...` : detailsText)}
                          </div>
                          {isLong && <button onClick={() => toggleRow(log.id)} className="mt-2 text-[10px] font-bold text-blue-500 uppercase">{isExpanded ? "Show Less" : "Read More"}</button>}
                        </div>

                        <div className="flex justify-between items-center text-[10px] font-mono opacity-50 pt-2 border-t border-dashed border-gray-500/30">
                          <span>{formatDate(log.timestamp)}</span>
                          <span>{log.ipAddress}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </motion.div>

        <p className="text-center text-[10px] uppercase tracking-[0.3em] opacity-30 font-black pt-4">Security Audit Trail • Auto-Sync Active</p>
      </div>
    </div>
  );
};

export default SystemLogsPage;