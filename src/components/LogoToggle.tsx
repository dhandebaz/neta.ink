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
      <div className="h-9 rounded-full px-4 text-xs font-medium border shadow-sm items-center justify-center inline-flex gap-2 border-slate-300 bg-white/80 text-slate-900 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white dark:hover:bg-slate-800">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-slate-950">
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
        relative overflow-hidden h-9 rounded-full px-4 text-xs font-medium border shadow-sm items-center justify-center inline-flex gap-2 border-slate-300 bg-white/80 text-slate-900 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white dark:hover:bg-slate-800
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
