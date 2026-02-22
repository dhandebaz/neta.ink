import { cookies } from "next/headers";
import crypto from "crypto";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const SESSION_COOKIE_NAME = "neta_session";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return secret;
}

function signUserId(userId: number) {
  const secret = getSecret();
  const payload = String(userId);
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const signature = hmac.digest("hex");
  return `${payload}.${signature}`;
}

function verifyToken(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [idPart, sigPart] = parts;
  const id = Number(idPart);
  if (!Number.isFinite(id) || id <= 0) return null;

  const secret = getSecret();
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(idPart);
  const expected = hmac.digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(sigPart, "hex"), Buffer.from(expected, "hex"))) {
    return null;
  }

  return id;
}

export async function getCurrentUser() {
  let cookieStore: ReturnType<typeof cookies> | null = null;

  try {
    cookieStore = cookies();
  } catch {
    return null;
  }

  const getCookie = (cookieStore as any)?.get;
  if (typeof getCookie !== "function") {
    return null;
  }

  const token = getCookie.call(cookieStore, SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const userId = verifyToken(token);
  if (!userId) {
    return null;
  }

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const user = rows[0] ?? null;
  return user;
}

export async function setUserSession(userId: number) {
  const token = signUserId(userId);
  const cookieStore = cookies();
  const isProd = process.env.NODE_ENV === "production";

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function clearUserSession() {
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}

