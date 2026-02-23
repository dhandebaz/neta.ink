import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { politicians, votes } from "@/db/schema";
import { and, count, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Sign in to vote on representatives." },
        { status: 401 }
      );
    }

    if (!user.voter_id_verified) {
      return NextResponse.json(
        {
          success: false,
          error: "Verify your Voter ID before casting a vote."
        },
        { status: 403 }
      );
    }

    const resolvedParams = await context.params;
    const idRaw = resolvedParams.id;
    const politicianId = Number(idRaw);

    if (!Number.isFinite(politicianId) || politicianId <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid politician id." },
        { status: 400 }
      );
    }

    const body = (await req.json().catch(() => null)) as
      | {
          voteType?: string;
        }
      | null;

    const voteTypeRaw = body?.voteType;
    const voteType =
      voteTypeRaw === "up" || voteTypeRaw === "down" ? voteTypeRaw : null;

    if (!voteType) {
      return NextResponse.json(
        { success: false, error: "Choose whether you want to upvote or downvote." },
        { status: 400 }
      );
    }

    const [politicianRow] = await db
      .select()
      .from(politicians)
      .where(eq(politicians.id, politicianId))
      .limit(1);

    if (!politicianRow) {
      return NextResponse.json(
        { success: false, error: "This representative could not be found." },
        { status: 404 }
      );
    }

    const userId = user.id;

    const result = await db.transaction(async (tx) => {
      const [existingVote] =
        (await tx
          .select()
          .from(votes)
          .where(
            and(eq(votes.user_id, userId), eq(votes.politician_id, politicianId))
          )
          .limit(1)) ?? [];

      if (existingVote) {
        await tx
          .update(votes)
          .set({
            vote_type: voteType,
            updated_at: new Date()
          })
          .where(eq(votes.id, existingVote.id));
      } else {
        await tx.insert(votes).values({
          user_id: userId,
          politician_id: politicianId,
          vote_type: voteType
        });
      }

      const [upRow] =
        (await tx
          .select({ value: count() })
          .from(votes)
          .where(
            and(
              eq(votes.politician_id, politicianId),
              eq(votes.vote_type, "up")
            )
          )) ?? [];

      const [downRow] =
        (await tx
          .select({ value: count() })
          .from(votes)
          .where(
            and(
              eq(votes.politician_id, politicianId),
              eq(votes.vote_type, "down")
            )
          )) ?? [];

      const votesUp = upRow?.value ?? 0;
      const votesDown = downRow?.value ?? 0;

      const totalVotes = votesUp + votesDown;
      const rating =
        totalVotes === 0 ? 0 : Number(((votesUp / totalVotes) * 5).toFixed(1));

      await tx
        .update(politicians)
        .set({
          votes_up: votesUp,
          votes_down: votesDown,
          rating: rating.toString()
        })
        .where(eq(politicians.id, politicianId));

      return {
        votesUp,
        votesDown,
        rating,
        userVote: voteType as "up" | "down"
      };
    });

    return NextResponse.json({
      success: true,
      votesUp: result.votesUp,
      votesDown: result.votesDown,
      rating: result.rating,
      userVote: result.userVote
    });
  } catch (error) {
    console.error("Error recording vote", error);
    return NextResponse.json(
      {
        success: false,
        error: "We could not record your vote. Please try again."
      },
      { status: 500 }
    );
  }
}
