// src/layouts/PageTemplate.js
import React from "react";
import { motion } from "framer-motion";
import useScrollReveal from "../hooks/useScrollReveal";

/**
 * PageTemplate Component
 * ✅ Adds page entrance animation
 * ✅ Enables scroll reveal globally
 * ✅ Handles responsive card/table layouts
 */
export default function PageTemplate({
  title = "",
  items = [],
  renderCard,
  renderRow,
  columns = [],
}) {
  useScrollReveal();
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full space-y-6"
    >
      {/* Page Title */}
      {title && (
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
          {title}
        </h1>
      )}

      {/* Responsive Layout */}
      {isMobile ? (
        // 📱 Card layout for mobile
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.length > 0 ? (
            items.map((item, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.03 }}
                transition={{ type: "spring", stiffness: 280, damping: 20 }}
                className="p-4 rounded-2xl bg-white/80 dark:bg-black/40 backdrop-blur-md shadow-md"
              >
                {renderCard ? renderCard(item, i) : <p>{JSON.stringify(item)}</p>}
              </motion.div>
            ))
          ) : (
            <p className="text-sm text-center opacity-60 py-10">No items found</p>
          )}
        </div>
      ) : (
        // 🖥️ Table layout for desktop
        <div className="overflow-x-auto rounded-2xl bg-white/80 dark:bg-black/40 backdrop-blur-md shadow-md">
          <table className="min-w-full text-sm border-collapse">
            <thead className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white">
              <tr>
                {columns.map((col, i) => (
                  <th key={i} className="py-2 px-3 text-left font-semibold">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item, i) => (
                  <tr
                    key={i}
                    className="hover:bg-white/70 dark:hover:bg-black/30 transition"
                  >
                    {renderRow ? (
                      renderRow(item, i)
                    ) : (
                      <td className="py-2 px-3">{JSON.stringify(item)}</td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="text-center py-6 text-slate-500 dark:text-slate-300"
                  >
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
