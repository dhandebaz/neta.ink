"use client";

import { useState } from "react";
import { AuthPhoneClient } from "./AuthPhoneClient";

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
  const [signingOut, setSigningOut] = useState(false);

  const openAuth = () => {
    setShowAuth(true);
  };

  const closeAuth = () => {
    setShowAuth(false);
  };

  const handleSignedIn = () => {
    setShowAuth(false);
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

  return (
    <>
      {user ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-200">
            {label}
          </span>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="inline-flex items-center justify-center rounded-full border border-slate-600 px-3 py-1 text-[11px] font-medium text-slate-100 hover:bg-slate-800 disabled:opacity-60"
          >
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={openAuth}
          className="inline-flex items-center justify-center rounded-full border border-slate-600 px-3 py-1 text-[11px] font-medium text-slate-100 hover:bg-slate-800"
        >
          Sign in
        </button>
      )}

      {showAuth && (
        <AuthPhoneClient onClose={closeAuth} onSignedIn={handleSignedIn} />
      )}
    </>
  );
}

