import { NextRequest } from "next/server";

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
};

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("Upstash Redis is not configured");
  }

  return { url, token };
}

async function incrementKey(key: string, windowSeconds: number): Promise<number> {
  const { url, token } = getRedisConfig();
  const encodedKey = encodeURIComponent(key);

  const incrResponse = await fetch(`${url}/incr/${encodedKey}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });

  const incrJson = (await incrResponse.json()) as { result?: number; error?: string };

  if (!incrResponse.ok || typeof incrJson.result !== "number") {
    throw new Error("Redis INCR failed");
  }

  const current = incrJson.result;

  if (current === 1 && windowSeconds > 0) {
    void fetch(`${url}/expire/${encodedKey}/${windowSeconds}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      },
      cache: "no-store"
    }).catch(() => {});
  }

  return current;
}

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const redisKey = `rl:${key}`;
  const current = await incrementKey(redisKey, windowSeconds);

  if (current > limit) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: Math.max(0, limit - current) };
}

function getRequestIp(req: NextRequest): string | null {
  const forwardedFor = req.headers.get("x-forwarded-for");

  if (forwardedFor && forwardedFor.length > 0) {
    const first = forwardedFor.split(",")[0]?.trim();

    if (first) {
      return first;
    }
  }

  const realIp = req.headers.get("x-real-ip");

  if (realIp && realIp.length > 0) {
    return realIp;
  }

  return null;
}

export function getIpKey(req: NextRequest, scope: string): string {
  const ip = getRequestIp(req) ?? "unknown";
  return `ip:${ip}:${scope}`;
}

export function getUserKey(userId: number | string, scope: string): string {
  const id = typeof userId === "number" ? String(userId) : userId;
  return `user:${id}:${scope}`;
}
