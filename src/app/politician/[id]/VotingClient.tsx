"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { AuthPhoneClient } from "@/components/AuthPhoneClient";
import { VoterIdModal } from "@/components/VoterIdModal";

type Props = {
  politicianId: number;
  initialVotesUp: number;
  initialVotesDown: number;
  initialRating: number | string;
  initialUserVote: "up" | "down" | null;
  isLoggedIn: boolean;
  isVoterVerified: boolean;
};

type VoteType = "up" | "down";

export function VotingClient(props: Props) {
  const [votesUp, setVotesUp] = useState(props.initialVotesUp);
  const [votesDown, setVotesDown] = useState(props.initialVotesDown);
  const [rating, setRating] = useState(
    typeof props.initialRating === "string"
      ? Number(props.initialRating) || 0
      : props.initialRating
  );
  const [currentVote, setCurrentVote] = useState<VoteType | null>(
    props.initialUserVote
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showVoterModal, setShowVoterModal] = useState(false);
  const [voterVerified, setVoterVerified] = useState(props.isVoterVerified);

  const applyLocalChange = (nextVote: VoteType) => {
    if (currentVote === nextVote) {
      return {
        votesUp,
        votesDown,
        rating,
        vote: currentVote
      };
    }

    let nextUp = votesUp;
    let nextDown = votesDown;

    if (nextVote === "up") {
      nextUp += 1;
      if (currentVote === "down") {
        nextDown -= 1;
      }
    } else {
      nextDown += 1;
      if (currentVote === "up") {
        nextUp -= 1;
      }
    }

    const total = nextUp + nextDown;
    const nextRating =
      total === 0 ? 0 : Number(((nextUp / total) * 5).toFixed(1));

    setVotesUp(nextUp);
    setVotesDown(nextDown);
    setRating(nextRating);
    setCurrentVote(nextVote);

    return {
      votesUp: nextUp,
      votesDown: nextDown,
      rating: nextRating,
      vote: nextVote
    };
  };

  const openAuth = () => {
    setShowAuth(true);
  };

  const closeAuth = () => {
    setShowAuth(false);
  };

  const openVoterModal = () => {
    setShowVoterModal(true);
  };

  const handleVerified = () => {
    setVoterVerified(true);
  };

  const sendVote = async (voteType: VoteType) => {
    if (loading) return;

    if (!props.isLoggedIn) {
      openAuth();
      return;
    }

    if (!voterVerified) {
      openVoterModal();
      return;
    }

    if (currentVote === voteType) {
      return;
    }

    setError(null);
    setLoading(true);

    const previousState = {
      votesUp,
      votesDown,
      rating,
      vote: currentVote
    };

    const optimistic = applyLocalChange(voteType);

    try {
      const res = await fetch(`/api/politicians/${props.politicianId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ voteType })
      });

      const json = (await res.json().catch(() => null)) as
        | {
            success: boolean;
            votesUp?: number;
            votesDown?: number;
            rating?: number;
            userVote?: VoteType;
            error?: string;
          }
        | null;

      if (
        !res.ok ||
        !json ||
        !json.success ||
        typeof json.votesUp !== "number" ||
        typeof json.votesDown !== "number" ||
        typeof json.rating !== "number" ||
        !json.userVote
      ) {
        throw new Error(json?.error || "Request failed");
      }

      setVotesUp(json.votesUp);
      setVotesDown(json.votesDown);
      setRating(json.rating);
      setCurrentVote(json.userVote);
    } catch (err) {
      setVotesUp(previousState.votesUp);
      setVotesDown(previousState.votesDown);
      setRating(previousState.rating);
      setCurrentVote(previousState.vote);
      setError("We could not save your vote. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const upActive = currentVote === "up";
  const downActive = currentVote === "down";

  return (
    <>
      <div className="mt-2 space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Citizen rating</div>
            <div className="text-lg font-semibold text-slate-50">
              {rating.toFixed(1)} / 5
            </div>
          </div>
          <div className="text-[11px] text-slate-400">
            {votesUp} up · {votesDown} down
          </div>
        </div>

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => sendVote("up")}
            disabled={loading}
            className={`flex-1 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition ${
              upActive
                ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                : "bg-slate-800 text-slate-100 hover:bg-slate-700"
            } ${loading ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <ThumbsUp
              className={`h-5 w-5 ${
                upActive ? "fill-emerald-500 text-emerald-900" : "text-slate-200"
              }`}
            />
            <span>Upvote</span>
          </button>
          <button
            type="button"
            onClick={() => sendVote("down")}
            disabled={loading}
            className={`flex-1 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition ${
              downActive
                ? "bg-rose-500 text-slate-950 hover:bg-rose-400"
                : "bg-slate-800 text-slate-100 hover:bg-slate-700"
            } ${loading ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <ThumbsDown
              className={`h-5 w-5 ${
                downActive ? "fill-rose-500 text-rose-900" : "text-slate-200"
              }`}
            />
            <span>Downvote</span>
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-400">
            {error}
          </p>
        )}
      </div>

      {showAuth && (
        <AuthPhoneClient
          onClose={closeAuth}
          onSignedIn={() => window.location.reload()}
        />
      )}
      {showVoterModal && (
        <VoterIdModal
          onClose={() => setShowVoterModal(false)}
          onVerified={handleVerified}
        />
      )}
    </>
  );
}
