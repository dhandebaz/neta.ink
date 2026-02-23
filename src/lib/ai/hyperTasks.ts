import { db } from "@/db/client";
import { politicians, politician_mentions, states, civic_tasks } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { callHyperbrowserAgent } from "./router";

type PoliticianMentionPayload = {
  title: string;
  snippet: string;
  url: string;
  source_type: "news" | "social" | "parliament" | "web";
  sentiment: "positive" | "neutral" | "negative";
  published_at?: string;
};

export async function fetchLivePoliticianUpdates(
  politicianId: number
): Promise<PoliticianMentionPayload[]> {
  const [politicianRow] =
    (await db
      .select({
        id: politicians.id,
        name: politicians.name,
        party: politicians.party,
        state_id: politicians.state_id
      })
      .from(politicians)
      .where(eq(politicians.id, politicianId))
      .limit(1)) ?? [];

  if (!politicianRow) {
    throw new Error("Politician not found");
  }

  const [stateRow] =
    (await db
      .select({
        id: states.id,
        name: states.name
      })
      .from(states)
      .where(and(eq(states.id, politicianRow.state_id)))
      .limit(1)) ?? [];

  const stateName = stateRow?.name ?? "India";
  const party = politicianRow.party ?? "an independent or unspecified party";

  const prompt =
    `You are a political researcher. Search the live web (Google News, Twitter, official portals) for the 5 most recent and significant updates, controversies, or news articles regarding "${politicianRow.name}", a politician from ${stateName} associated with ${party}. ` +
    'Return STRICT JSON: [{ "title": "...", "snippet": "...", "url": "...", "source_type": "news", "sentiment": "negative|neutral|positive", "published_at": "YYYY-MM-DD" }]. Do not include markdown fences.';

  const result = await callHyperbrowserAgent(prompt);
  let text = result.text.trim();

  if (text.startsWith("```")) {
    const firstNewline = text.indexOf("\n");
    if (firstNewline !== -1) {
      text = text.slice(firstNewline + 1);
    }
    const lastFence = text.lastIndexOf("```");
    if (lastFence !== -1) {
      text = text.slice(0, lastFence);
    }
    text = text.trim();
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse Hyperbrowser politician updates JSON", { text, error });
    throw new Error("AI response invalid");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("AI response must be an array");
  }

  const mentions: PoliticianMentionPayload[] = [];

  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;

    const anyItem = item as any;
    const title = typeof anyItem.title === "string" ? anyItem.title.trim() : "";
    const snippet = typeof anyItem.snippet === "string" ? anyItem.snippet.trim() : "";
    const url = typeof anyItem.url === "string" ? anyItem.url.trim() : "";
    const sourceRaw = typeof anyItem.source_type === "string" ? anyItem.source_type : "";
    const sentimentRaw = typeof anyItem.sentiment === "string" ? anyItem.sentiment : "";
    const publishedRaw =
      typeof anyItem.published_at === "string" ? anyItem.published_at.trim() : "";

    if (!title || !snippet || !url) {
      continue;
    }

    let source_type: PoliticianMentionPayload["source_type"] = "web";
    const loweredSource = sourceRaw.toLowerCase();
    if (loweredSource === "news") source_type = "news";
    else if (loweredSource === "social") source_type = "social";
    else if (loweredSource === "parliament") source_type = "parliament";

    let sentiment: PoliticianMentionPayload["sentiment"] = "neutral";
    const loweredSentiment = sentimentRaw.toLowerCase();
    if (loweredSentiment === "positive") sentiment = "positive";
    else if (loweredSentiment === "negative") sentiment = "negative";

    let published_at: string | undefined;
    if (publishedRaw && /^\d{4}-\d{2}-\d{2}$/.test(publishedRaw)) {
      published_at = publishedRaw;
    }

    mentions.push({
      title,
      snippet,
      url,
      source_type,
      sentiment,
      published_at
    });
  }

  if (mentions.length === 0) {
    return [];
  }

  const existingRows =
    (await db
      .select({
        url: politician_mentions.url
      })
      .from(politician_mentions)
      .where(eq(politician_mentions.politician_id, politicianId))) ?? [];

  const existingUrls = new Set(
    existingRows
      .map((row) => row.url)
      .filter((url): url is string => typeof url === "string" && url.length > 0)
  );

  const toInsert = mentions.filter((m) => !existingUrls.has(m.url));

  if (toInsert.length > 0) {
    await db.insert(politician_mentions).values(
      toInsert.map((m) => ({
        politician_id: politicianId,
        source_type: m.source_type,
        title: m.title,
        snippet: m.snippet,
        url: m.url,
        sentiment: m.sentiment,
        published_at: m.published_at ? new Date(m.published_at) : null
      }))
    );

    // If AI detects sentiment negative, insert a row into civic_tasks
    for (const m of toInsert) {
      if (m.sentiment === "negative") {
        await db.insert(civic_tasks).values({
          title: `Verify controversy: ${m.title}`,
          description: `A negative mention was detected: "${m.snippet}". Please verify the authenticity and details. URL: ${m.url}`,
          points_reward: 20,
          state_id: politicianRow.state_id,
          status: "open"
        });
      }
    }
  }

  return mentions;
}
