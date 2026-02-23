"use client";

import { useEffect, useState } from "react";
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-700 dark:text-slate-200 transition-colors">
            {label}
          </span>
          {stateLabel && (
            <button
              type="button"
              onClick={() => setShowStateModal(true)}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {stateLabel}
            </button>
          )}
          <Link
            href="/volunteer"
            className="inline-flex h-11 min-w-[44px] items-center justify-center rounded-full border border-emerald-600 px-3 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/70 dark:text-emerald-300 dark:hover:bg-emerald-500/20 transition-colors"
          >
            Volunteer
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-11 min-w-[44px] items-center justify-center rounded-full border border-slate-300 px-4 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Dashboard
          </Link>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="inline-flex h-11 min-w-[44px] items-center justify-center rounded-full border border-slate-300 px-3 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800 disabled:opacity-60 transition-colors"
          >
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={openAuth}
          className="inline-flex items-center justify-center rounded-full border border-slate-300 px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800 transition-colors"
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
