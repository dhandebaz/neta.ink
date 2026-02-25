"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function LogoToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => {
      window.cancelAnimationFrame(id);
    };
  }, []);

  const toggleTheme = () => {
    setIsLoading(true);
    // Simulate loading for effect and then switch
    setTimeout(() => {
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
      setIsLoading(false);
    }, 600);
  };

  if (!mounted) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1 text-sm font-semibold tracking-tight text-slate-50 ring-1 ring-slate-700">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-slate-950">
          n
        </span>
        <span>neta</span>
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative overflow-hidden inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold tracking-tight ring-1 transition-all duration-300
        ${
          isDark
            ? "bg-slate-900/80 text-slate-50 ring-slate-700 hover:bg-slate-900"
            : "bg-white/80 text-slate-900 ring-slate-200 hover:bg-white shadow-sm"
        }
      `}
      aria-label="Toggle theme"
    >
      {/* Loading Shine Effect */}
      {isLoading && (
        <div className="absolute inset-0 z-0 overflow-hidden rounded-full pointer-events-none">
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shine_1.5s_infinite]" />
        </div>
      )}

      <div className="relative z-10 flex items-center gap-2">
        <motion.span
          layout
          initial={false}
          animate={{
            rotate: isDark ? 0 : 180,
            backgroundColor: isDark ? "#fbbf24" : "#0f172a",
            color: isDark ? "#020617" : "#f8fafc",
          }}
          transition={{ type: "spring", stiffness: 200, damping: 10 }}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
        >
          n
        </motion.span>
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
             <motion.span
               key="dark"
               initial={{ opacity: 0, y: 5 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -5 }}
               transition={{ duration: 0.2 }}
             >
               neta
             </motion.span>
          ) : (
             <motion.span
               key="light"
               initial={{ opacity: 0, y: 5 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -5 }}
               transition={{ duration: 0.2 }}
             >
               neta
             </motion.span>
          )}
        </AnimatePresence>
      </div>
    </button>
  );
}
