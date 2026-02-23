import type { Metadata } from "next";
import { CompareClient } from "./CompareClient";

export const metadata: Metadata = {
  title: "Compare Politicians | NetaInk",
  description:
    "Compare assets, criminal records, and citizen ratings of Indian politicians side-by-side."
};

export default function ComparePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-5xl space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
            Compare Representatives
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Compare assets, criminal records, and citizen ratings of Indian politicians side-by-side.
          </p>
        </header>

        <CompareClient />
      </div>
    </main>
  );
}

