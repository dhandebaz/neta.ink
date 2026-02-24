"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
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

  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  const getVerifier = () => {
    if (!hasFirebaseConfig) return null;
    if (typeof window === "undefined") return null;

    if ((window as any).netaRecaptchaVerifier) {
      return (window as any).netaRecaptchaVerifier as RecaptchaVerifier;
    }

    if (recaptchaContainerRef.current) {
      try {
        // Clear any existing verifier instance
        if ((window as any).netaRecaptchaVerifier) {
          try {
            (window as any).netaRecaptchaVerifier.clear();
          } catch (e) {
            // Ignore clear errors
          }
          (window as any).netaRecaptchaVerifier = undefined;
        }

        const verifier = new RecaptchaVerifier(
          auth,
          recaptchaContainerRef.current,
          {
            size: "invisible",
            callback: () => {
              // reCAPTCHA solved, allow signInWithPhoneNumber.
            },
            "expired-callback": () => {
              // Response expired. Ask user to solve reCAPTCHA again.
              setError("reCAPTCHA expired. Please try again.");
            }
          }
        );
        (window as any).netaRecaptchaVerifier = verifier;
        return verifier;
      } catch (err) {
        console.error("Error creating RecaptchaVerifier:", err);
        return null;
      }
    }
    return null;
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize verifier on mount if possible, but also rely on lazy init
  useEffect(() => {
    if (mounted && recaptchaContainerRef.current && !(window as any).netaRecaptchaVerifier) {
       getVerifier();
    }
  }, [mounted]);

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
      
      const verifier = getVerifier();
      if (!verifier) {
        throw new Error("RecaptchaVerifier could not be initialized. Please refresh and try again.");
      }

      const result = await signInWithPhoneNumber(auth, fullNumber, verifier);
      setConfirmation(result);
      setStep("otp");
      setMessage("OTP sent. Please check your phone.");
    } catch (err: any) {
      console.error("Phone sign-in error:", err);
      
      if (err.code === "auth/network-request-failed") {
        setError("Network error. Check your connection or try disabling ad-blockers.");
      } else if (err.code === "auth/captcha-check-failed") {
        setError("reCAPTCHA check failed. Please try again.");
      } else if (err.code === "auth/invalid-phone-number") {
        setError("Invalid phone number format.");
      } else if (err.message && err.message.includes("requests from this domain")) {
        setError("This domain is not authorized in Firebase Console.");
      } else if (err.message) {
        // Strip technical prefixes if possible, or show full message for debugging
        setError(err.message.replace("Firebase: ", "").replace(" (auth/internal-error)", ""));
      } else {
        setError("Could not send OTP. Please try again.");
      }
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
    } catch (err: any) {
      console.error("OTP verification error:", err);

      const code = err?.code as string | undefined;
      const message = typeof err?.message === "string" ? err.message : "";

      if (code === "auth/invalid-verification-code") {
        setError("Invalid OTP. Please check and try again.");
      } else if (code === "auth/missing-verification-code" || code === "auth/code-expired") {
        setError("OTP has expired. Please request a new OTP.");
      } else if (message) {
        setError(message.replace("Firebase: ", "").replace(" (auth/internal-error)", ""));
      } else {
        setError("OTP verification failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const content = !hasFirebaseConfig ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950/95 transition-colors">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 transition-colors">Sign in to neta</div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 transition-colors">
              Phone sign-in is not available in this preview environment.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-[11px] text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="space-y-2 text-[11px] text-slate-600 dark:text-slate-300 transition-colors">
          <p>
            Auth is wired for production with Firebase Phone Auth and invisible reCAPTCHA. In this
            environment, the backend is disabled so you can explore flows without sending SMS.
          </p>
          <p className="text-slate-500 dark:text-slate-400 transition-colors">
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
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950/95 transition-colors">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 transition-colors">Sign in to neta</div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 transition-colors">
              Use your phone number to sign in. We never share your details.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-[11px] text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {step === "phone" && (
            <div className="space-y-3">
              <label className="block text-xs text-slate-600 dark:text-slate-300 transition-colors">
                Phone number
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 transition-colors"
                />
              </label>
              <button
                type="button"
                onClick={startPhoneSignIn}
                disabled={loading}
                className="flex w-full items-center justify-center rounded-full bg-amber-400 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-amber-300 disabled:opacity-60 transition-colors"
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </div>
          )}

          {step === "otp" && (
            <div className="space-y-3">
              <label className="block text-xs text-slate-600 dark:text-slate-300 transition-colors">
                Enter OTP
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 transition-colors"
                />
              </label>
              <button
                type="button"
                onClick={verifyOtp}
                disabled={loading}
                className="flex w-full items-center justify-center rounded-full bg-amber-400 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-amber-300 disabled:opacity-60 transition-colors"
              >
                {loading ? "Verifying..." : "Verify and continue"}
              </button>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 transition-colors">
              {error}
            </p>
          )}
          {message && !error && (
            <p className="text-xs text-emerald-600 dark:text-emerald-300 transition-colors">
              {message}
            </p>
          )}
        </div>

        <div ref={recaptchaContainerRef} className="mt-2 h-0 overflow-hidden" />
      </div>
    </div>
  );

  if (!mounted) {
    return null;
  }

  return createPortal(content, document.body);
}
