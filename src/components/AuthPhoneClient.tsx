"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth, hasFirebaseConfig } from "@/lib/firebase";

type Props = {
  onClose?: () => void;
  onSignedIn?: () => void;
};

type Step = "phone" | "otp";

export function AuthPhoneClient(props: Props) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmation, setConfirmation] =
    useState<import("firebase/auth").ConfirmationResult | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!hasFirebaseConfig) return;
    if (typeof window === "undefined") return;
    const existing = document.getElementById("neta-recaptcha-container");
    if (!existing) return;

    if (!(window as any).netaRecaptchaVerifier) {
      (window as any).netaRecaptchaVerifier = new RecaptchaVerifier(
        auth,
        "neta-recaptcha-container",
        {
          size: "invisible"
        }
      );
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = () => {
    if (props.onClose) {
      props.onClose();
    }
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    close();
  };

  const startPhoneSignIn = async () => {
    setError(null);
    setMessage(null);

    const trimmed = phone.trim();
    if (!trimmed) {
      setError("Enter your phone number.");
      return;
    }

    const fullNumber = trimmed.startsWith("+91") ? trimmed : `+91${trimmed}`;

    try {
      setLoading(true);
      const verifier = (window as any).netaRecaptchaVerifier as RecaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, fullNumber, verifier);
      setConfirmation(result);
      setStep("otp");
      setMessage("OTP sent. Please check your phone.");
    } catch {
      setError("Could not send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError(null);
    setMessage(null);

    if (!confirmation) {
      setError("Start with your phone number first.");
      return;
    }

    const code = otp.trim();
    if (!code) {
      setError("Enter the OTP.");
      return;
    }

    try {
      setLoading(true);
      const cred = await confirmation.confirm(code);
      const user = cred.user;
      const token = await user.getIdToken();

      const firebaseUid = user.uid;
      const displayName = user.displayName || null;
      const phoneNumber = user.phoneNumber || phone;

      const res = await fetch("/api/auth/phone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          firebaseUid,
          phoneNumber,
          displayName: displayName || undefined
        })
      });

      const json = (await res.json()) as {
        success: boolean;
        error?: string;
      };

      if (!res.ok || !json.success) {
        setError(json.error || "Sign-in failed.");
        return;
      }

      setMessage("Signed in successfully.");
      if (props.onSignedIn) {
        props.onSignedIn();
      } else {
        window.location.reload();
      }
    } catch {
      setError("OTP verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const content = !hasFirebaseConfig ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950/95 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-100">Sign in to neta</div>
            <p className="mt-1 text-[11px] text-slate-400">
              Phone sign-in is not available in this preview environment.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 text-[11px] text-slate-300 hover:bg-slate-800"
          >
            ✕
          </button>
        </div>
        <div className="space-y-2 text-[11px] text-slate-300">
          <p>
            Auth is wired for production with Firebase Phone Auth and invisible reCAPTCHA. In this
            environment, the backend is disabled so you can explore flows without sending SMS.
          </p>
          <p className="text-slate-400">
            To test real sign-in, configure Firebase credentials and redeploy.
          </p>
        </div>
      </div>
    </div>
  ) : (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950/95 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-100">Sign in to neta</div>
            <p className="mt-1 text-[11px] text-slate-400">
              Use your phone number to sign in. We never share your details.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 text-[11px] text-slate-300 hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {step === "phone" && (
            <div className="space-y-3">
              <label className="block text-xs text-slate-300">
                Phone number
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400"
                />
              </label>
              <button
                type="button"
                onClick={startPhoneSignIn}
                disabled={loading}
                className="flex w-full items-center justify-center rounded-full bg-amber-400 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-amber-300 disabled:opacity-60"
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </div>
          )}

          {step === "otp" && (
            <div className="space-y-3">
              <label className="block text-xs text-slate-300">
                Enter OTP
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400"
                />
              </label>
              <button
                type="button"
                onClick={verifyOtp}
                disabled={loading}
                className="flex w-full items-center justify-center rounded-full bg-amber-400 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-amber-300 disabled:opacity-60"
              >
                {loading ? "Verifying..." : "Verify and continue"}
              </button>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400">
              {error}
            </p>
          )}
          {message && !error && (
            <p className="text-xs text-emerald-300">
              {message}
            </p>
          )}
        </div>

        <div id="neta-recaptcha-container" className="mt-2 h-0 overflow-hidden" />
      </div>
    </div>
  );

  if (!mounted) {
    return null;
  }

  return createPortal(content, document.body);
}
