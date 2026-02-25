"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

type Props = {
  onClose?: () => void;
  onVerified?: () => void;
};

export function VoterIdModal({ onClose, onVerified }: Props) {
  const [mounted, setMounted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget || (event.target as HTMLElement).dataset.close) {
      onClose?.();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setError(null);
    setFile(selected);
  };

  const handleSubmit = async () => {
    if (!file || submitting) {
      if (!file) {
        setError("Add a clear photo of your Voter ID card.");
      }
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/auth/verify-voter-id", {
        method: "POST",
        body: formData
      });

      const json = (await res.json().catch(() => null)) as
        | {
            success: boolean;
            message?: string;
            error?: string;
          }
        | null;

      if (!res.ok || !json || !json.success) {
        const message =
          json && typeof json.error === "string" && json.error.length > 0
            ? json.error
            : "We could not verify this card. Try a sharper, well-lit photo.";
        setError(message);
        return;
      }

      onVerified?.();
      onClose?.();
    } catch {
      setError("Network error while verifying your Voter ID. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/60 dark:bg-black/60 px-4 pb-6 pt-10 sm:items-center sm:px-0"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/95 p-4 shadow-xl sm:mx-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Verify your Voter ID
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Add a clear photo of your EPIC card to confirm you are eligible to vote.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-close="true"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          <label className="flex min-h-[56px] cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-3 py-3 text-sm text-slate-900 dark:text-slate-100">
            <div className="flex flex-1 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                📷
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium">
                  Tap to add photo
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Use your camera or gallery. Front side of the card is enough.
                </span>
              </div>
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          {previewUrl && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
              <Image
                src={previewUrl}
                alt="Selected Voter ID"
                width={800}
                height={512}
                className="max-h-64 w-full object-cover"
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className={`mt-1 flex h-11 w-full items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold text-slate-950 transition ${
              submitting ? "opacity-70" : "hover:bg-emerald-400"
            }`}
          >
            {submitting ? "Verifying…" : "Verify and continue"}
          </button>

          <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-500">
            Your Voter ID image is stored securely and used only to check that one card
            belongs to one account.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
