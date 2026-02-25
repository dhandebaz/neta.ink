"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="mb-8 flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 print:hidden dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
    >
      <Printer className="h-4 w-4" />
      Print Document
    </button>
  );
}
