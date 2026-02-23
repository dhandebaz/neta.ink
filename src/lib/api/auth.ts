import type { NextRequest } from "next/server";
import { db } from "@/db/client";
import { users, type User } from "@/db/schema";
import { eq } from "drizzle-orm";

type ApiAuthResult =
  | {
      authorized: false;
      error: string;
      status: number;
    }
  | {
      authorized: true;
      user: User;
    };

export async function validateAndConsumeApiKey(
  req: NextRequest
): Promise<ApiAuthResult> {
  const key = req.headers.get("x-api-key");

  if (!key) {
    return {
      authorized: false,
      error: "Missing x-api-key header",
      status: 401
    };
  }

  const [user] =
    (await db
      .select()
      .from(users)
      .where(eq(users.api_key, key))
      .limit(1)) ?? [];

  if (!user) {
    return {
      authorized: false,
      error: "Invalid API key",
      status: 401
    };
  }

  const used = user.api_calls_this_month ?? 0;
  const limit = user.api_limit ?? 0;

  if (limit > 0 && used >= limit) {
    return {
      authorized: false,
      error: "API Quota Exceeded",
      status: 429
    };
  }

  await db
    .update(users)
    .set({
      api_calls_this_month: used + 1
    })
    .where(eq(users.id, user.id));

  return {
    authorized: true,
    user
  };
}

