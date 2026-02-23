"use client";

import { useState } from "react";
import { AuthPhoneClient } from "@/components/AuthPhoneClient";
import { VoterIdModal } from "@/components/VoterIdModal";

type Props = {
  politicianId: number;
  initialVotesUp: number;
  initialVotesDown: number;
  initialRating: number;
  initialUserVote: "up" | "down" | null;
  isLoggedIn: boolean;
  isVoterVerified: boolean;
};

type VoteType = "up" | "down";

export function VotingClient(props: Props) {
  const [votesUp, setVotesUp] = useState(props.initialVotesUp);
  const [votesDown, setVotesDown] = useState(props.initialVotesDown);
  const [rating, setRating] = useState(props.initialRating);
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
      total === 0 ? 0 : Number(((nextUp / total) * 5).toFixed(2));

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
            data?: {
              votesUp: number;
              votesDown: number;
              rating: number;
              userVote: VoteType;
            };
            error?: string;
          }
        | null;

      if (!res.ok || !json || !json.success || !json.data) {
        throw new Error(json?.error || "Request failed");
      }

      setVotesUp(json.data.votesUp);
      setVotesDown(json.data.votesDown);
      setRating(json.data.rating);
      setCurrentVote(json.data.userVote);
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
      <div className="mt-2 space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full gap-2">
            <button
              type="button"
              onClick={() => sendVote("up")}
              disabled={loading}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                upActive
                  ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                  : "bg-slate-800 text-slate-100 hover:bg-slate-700"
              } ${loading ? "cursor-not-allowed opacity-60" : ""}`}
            >
              Upvote
            </button>
            <button
              type="button"
              onClick={() => sendVote("down")}
              disabled={loading}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                downActive
                  ? "bg-rose-500 text-slate-950 hover:bg-rose-400"
                  : "bg-slate-800 text-slate-100 hover:bg-slate-700"
              } ${loading ? "cursor-not-allowed opacity-60" : ""}`}
            >
              Downvote
            </button>
          </div>
          <div className="text-xs text-slate-300 sm:text-right">
            <div>
              {rating.toFixed(1)} / 5 ({votesUp} up, {votesDown} down)
            </div>
          </div>
        </div>
        {error && (
          <p className="text-xs text-red-400">
            {error}
          </p>
        )}
      </div>

      {showAuth && <AuthPhoneClient onClose={closeAuth} />}
      {showVoterModal && (
        <VoterIdModal
          onClose={() => setShowVoterModal(false)}
          onVerified={handleVerified}
        />
      )}
    </>
  );
}
