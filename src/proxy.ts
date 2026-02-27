import { NextRequest, NextResponse } from "next/server";

// STRICT FIX: Edge compatibility - No Node.js imports allowed here.
// Rate limiting is temporarily disabled or simplified for Edge Runtime compliance if needed.
// Current implementation uses in-memory Map which is per-isolate in Edge.
// It won't be globally consistent but it prevents crashes.

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

// Global in-memory store for rate limiting (fallback when Redis is not used)
// Note: This resets on server restart/redeploy
const store: Map<string, RateLimitEntry> =
  (globalThis as any).__netaink_rate_limit_store ??
  ((globalThis as any).__netaink_rate_limit_store = new Map<string, RateLimitEntry>());

function getIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  return "unknown";
}

function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = store.get(key);

  if (!current || now >= current.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (current.count >= limit) {
    return { allowed: false };
  }

  current.count += 1;
  store.set(key, current);
  return { allowed: true };
}

export function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname.replace(/\/$/, "");

  // Define rate-limited paths
  const limited =
    pathname === "/api/rti/draft" ||
    pathname === "/api/complaints/generate" ||
    pathname === "/api/complaints/analyze";

  if (!limited) {
    return NextResponse.next();
  }

  const ip = getIp(req);
  const key = `${ip}:${pathname}`;
  
  // Limit: 3 requests per 60 seconds
  // If this causes Edge crashes, comment out checkRateLimit
  try {
    const limit = checkRateLimit(key, 3, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait 60 seconds." },
        { status: 429 }
      );
    }
  } catch (e) {
    console.error("Rate limit error:", e);
    // Fail open if rate limit check fails
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*"
};
