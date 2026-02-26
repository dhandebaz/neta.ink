"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";

type ShareButtonClientProps = {
  title: string;
  text: string;
  url: string;
};

export default function ShareButtonClient({
  title,
  text,
  url,
}: ShareButtonClientProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    // Construct viral text using name (from title prop) and URL
    const viralText = `I just checked ${title}'s actual civic record on Neta.ink. See where they rank: ${url}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: viralText, // Some apps use title as subject
          text: viralText,
          url,
        });
      } catch (error) {
        // User cancelled or share failed, ignore
        console.log("Share failed or cancelled", error);
      }
    } else {
      // Fallback
      try {
        await navigator.clipboard.writeText(`${viralText} ${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy", err);
      }
    }
  };

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition"
    >
      <Share2 className="w-4 h-4" />
      {copied ? "Link copied!" : "Share Neta Card"}
    </button>
  );
}
