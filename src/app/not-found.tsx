"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          404 - Page Not Found
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          The representative or page you are looking for does not exist or has been
          moved.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-amber-400 px-4 text-sm font-semibold text-slate-950 hover:bg-amber-300"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}

