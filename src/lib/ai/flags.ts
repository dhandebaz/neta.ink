import { db } from "@/db/client";
import { system_settings } from "@/db/schema";
import { getFeatureFlagBoolean } from "@/lib/states";
import { eq } from "drizzle-orm";

async function setBooleanSetting(key: string, enabled: boolean) {
  const rows = await db
    .select({ id: system_settings.id })
    .from(system_settings)
    .where(eq(system_settings.key, key))
    .limit(1);

  const value = enabled ? "true" : "false";

  if (rows.length === 0) {
    await db.insert(system_settings).values({
      key,
      value
    });
  } else {
    await db
      .update(system_settings)
      .set({ value })
      .where(eq(system_settings.id, rows[0].id));
  }
}

export async function isAiRtiEnabled(): Promise<boolean> {
  return getFeatureFlagBoolean("ai_rti_enabled_global", true);
}

export async function isAiComplaintsEnabled(): Promise<boolean> {
  return getFeatureFlagBoolean("ai_complaints_enabled_global", true);
}

export async function setAiRtiEnabled(enabled: boolean): Promise<void> {
  await setBooleanSetting("ai_rti_enabled_global", enabled);
}

export async function setAiComplaintsEnabled(enabled: boolean): Promise<void> {
  await setBooleanSetting("ai_complaints_enabled_global", enabled);
}

