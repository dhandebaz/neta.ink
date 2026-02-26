"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { AuthPhoneClient } from "./AuthPhoneClient";
import { StateOnboardingClient } from "./StateOnboardingClient";

type UserSummary = {
  id: number;
  name: string | null;
  phone_number: string;
  state_code: string;
  is_system_admin: boolean;
};

type Props = {
  user: UserSummary | null;
};

export function UserMenuClient(props: Props) {
  const [showAuth, setShowAuth] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const openAuth = () => {
    setShowAuth(true);
  };

  const closeAuth = () => {
    setShowAuth(false);
  };

  const handleSignedIn = () => {
    setShowAuth(false);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("neta_recent_signin", "1");
      } catch {
      }
    }
    window.location.reload();
  };

  const signOut = async () => {
    try {
      setSigningOut(true);
      await fetch("/api/auth/logout", {
        method: "POST"
      });
      window.location.reload();
    } finally {
      setSigningOut(false);
    }
  };

  const user = props.user;
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    if (typeof window === "undefined") return;

    try {
      const recent = window.localStorage.getItem("neta_recent_signin");
      const onboarded = window.localStorage.getItem("neta_state_onboarded");

      if (recent === "1" && !onboarded) {
        setShowStateModal(true);
        window.localStorage.removeItem("neta_recent_signin");
      }
    } catch {
    }
  }, [userId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  let label = "Sign in";
  if (user) {
    if (user.name && user.name.trim().length > 0) {
      label = `Hi, ${user.name.split(" ")[0]}`;
    } else if (user.phone_number && user.phone_number.length > 0) {
      label = `Hi, ${user.phone_number}`;
    } else {
      label = "Hi, citizen";
    }
  }

  const stateLabel = user ? user.state_code : null;

  return (
    <>
      {user ? (
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="h-9 rounded-full px-4 text-xs font-medium border shadow-sm items-center justify-center inline-flex gap-2 border-slate-300 bg-white/80 text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-slate-50 dark:bg-slate-100 dark:text-slate-900">
              {user.name && user.name.trim().length > 0
                ? user.name.trim()[0]?.toUpperCase()
                : user.phone_number && user.phone_number.length >= 4
                ? user.phone_number.slice(-2)
                : "u"}
            </span>
            <span className="hidden sm:inline">
              {label}
            </span>
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white py-2 text-[11px] shadow-lg dark:border-slate-700 dark:bg-slate-900 z-50">
              <div className="px-3 pb-2 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="font-medium text-slate-800 dark:text-slate-100">
                  {label}
                </div>
                {stateLabel && (
                  <button
                    type="button"
                    onClick={() => setShowStateModal(true)}
                    className="mt-1 inline-flex items-center rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    State: {stateLabel}
                  </button>
                )}
              </div>

              {stateLabel && (
                <>
                  <Link
                    href="/rankings"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    Rankings
                  </Link>
                  <Link
                    href="/politicians"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    Politicians
                  </Link>
                </>
              )}

              <Link
                href="/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Dashboard
              </Link>

              {user.is_system_admin && (
                <Link
                  href="/system"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center px-3 py-1.5 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                >
                  ⚙️ System Admin
                </Link>
              )}
              
              <Link
                href="/volunteer"
                onClick={() => setIsOpen(false)}
                className="flex items-center px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Volunteer tasks
              </Link>

              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

              <button
                type="button"
                onClick={signOut}
                disabled={signingOut}
                className="flex w-full items-center justify-between px-3 py-1.5 text-[11px] text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:text-rose-400 dark:hover:bg-rose-500/10"
              >
                <span>Sign out</span>
                <span className="text-[10px] text-rose-400 dark:text-rose-300">
                  {signingOut ? "…" : ""}
                </span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={openAuth}
          className="h-9 rounded-full px-4 text-xs font-medium border shadow-sm items-center justify-center inline-flex gap-2 border-slate-300 bg-white/80 text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          Sign in
        </button>
      )}

      {showAuth && (
        <AuthPhoneClient onClose={closeAuth} onSignedIn={handleSignedIn} />
      )}

      {user && showStateModal && (
        <StateOnboardingClient
          initialStateCode={user.state_code}
          onClose={() => setShowStateModal(false)}
        />
      )}
    </>
  );
}
