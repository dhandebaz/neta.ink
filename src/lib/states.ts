import { db } from "@/db/client";
import { state_settings, states, system_settings, type State } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const INDIAN_STATES = [
  { code: "DL", name: "Delhi" },
  { code: "AP", name: "Andhra Pradesh" },
  { code: "AR", name: "Arunachal Pradesh" },
  { code: "AS", name: "Assam" },
  { code: "BR", name: "Bihar" },
  { code: "CG", name: "Chhattisgarh" },
  { code: "GA", name: "Goa" },
  { code: "GJ", name: "Gujarat" },
  { code: "HR", name: "Haryana" },
  { code: "HP", name: "Himachal Pradesh" },
  { code: "JH", name: "Jharkhand" },
  { code: "KA", name: "Karnataka" },
  { code: "KL", name: "Kerala" },
  { code: "MP", name: "Madhya Pradesh" },
  { code: "MH", name: "Maharashtra" },
  { code: "MN", name: "Manipur" },
  { code: "ML", name: "Meghalaya" },
  { code: "MZ", name: "Mizoram" },
  { code: "NL", name: "Nagaland" },
  { code: "OD", name: "Odisha" },
  { code: "PB", name: "Punjab" },
  { code: "RJ", name: "Rajasthan" },
  { code: "SK", name: "Sikkim" },
  { code: "TN", name: "Tamil Nadu" },
  { code: "TS", name: "Telangana" },
  { code: "TR", name: "Tripura" },
  { code: "UK", name: "Uttarakhand" },
  { code: "UP", name: "Uttar Pradesh" },
  { code: "WB", name: "West Bengal" },
  { code: "AN", name: "Andaman and Nicobar Islands" },
  { code: "CH", name: "Chandigarh" },
  { code: "DN", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "JK", name: "Jammu and Kashmir" },
  { code: "LA", name: "Ladakh" },
  { code: "LD", name: "Lakshadweep" },
  { code: "PY", name: "Puducherry" }
];

export async function ensureDelhiState(): Promise<State> {
  const existing = await db
    .select()
    .from(states)
    .where(eq(states.code, "DL"))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const inserted = await db
    .insert(states)
    .values({
      code: "DL",
      name: "Delhi",
      is_enabled: true,
      ingestion_status: "idle"
    })
    .returning();

  return inserted[0];
}

export async function getStateByCode(code: string): Promise<State | null> {
  const rows = await db
    .select()
    .from(states)
    .where(eq(states.code, code))
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

export async function getUserOrDefaultState(user: {
  state_code: string | null;
} | null): Promise<{ code: string; name: string }> {
  const fallbackCode = "DL";

  const rawCode = user?.state_code;
  const desiredCode =
    rawCode && rawCode.trim().length === 2 ? rawCode.trim().toUpperCase() : fallbackCode;

  const byUserCode = await getStateByCode(desiredCode);
  if (byUserCode) {
    return { code: byUserCode.code, name: byUserCode.name };
  }

  const byFallbackCode = await getStateByCode(fallbackCode);
  if (byFallbackCode) {
    return { code: byFallbackCode.code, name: byFallbackCode.name };
  }

  const fromStatic =
    INDIAN_STATES.find((s) => s.code === desiredCode) ??
    INDIAN_STATES.find((s) => s.code === fallbackCode);

  return {
    code: fromStatic?.code ?? desiredCode,
    name: fromStatic?.name ?? "Delhi"
  };
}

export async function getFeatureFlagBoolean(
  key: string,
  defaultValue: boolean
): Promise<boolean> {
  const rows = await db
    .select()
    .from(system_settings)
    .where(eq(system_settings.key, key))
    .limit(1);

  if (rows.length === 0) {
    return defaultValue;
  }

  const raw = rows[0].value.toLowerCase();

  if (raw === "true" || raw === "1" || raw === "yes" || raw === "on") {
    return true;
  }

  if (raw === "false" || raw === "0" || raw === "no" || raw === "off") {
    return false;
  }

  return defaultValue;
}

export async function getStateAndGlobalFeatureFlagBoolean(
  stateCode: string,
  baseKey: string,
  defaultValue: boolean
): Promise<boolean> {
  const code = stateCode.toUpperCase().trim();
  const stateKey = `${baseKey}_${code}`;
  const globalKey = `${baseKey}_global`;

  const stateRows = await db
    .select()
    .from(state_settings)
    .where(and(eq(state_settings.state_code, code), eq(state_settings.key, stateKey)))
    .limit(1);

  if (stateRows.length > 0) {
    const raw = stateRows[0].value.toLowerCase();

    if (raw === "true" || raw === "1" || raw === "yes" || raw === "on") {
      return true;
    }

    if (raw === "false" || raw === "0" || raw === "no" || raw === "off") {
      return false;
    }
  }

  const systemRows = await db
    .select()
    .from(system_settings)
    .where(eq(system_settings.key, stateKey))
    .limit(1);

  if (systemRows.length > 0) {
    const raw = systemRows[0].value.toLowerCase();

    if (raw === "true" || raw === "1" || raw === "yes" || raw === "on") {
      return true;
    }

    if (raw === "false" || raw === "0" || raw === "no" || raw === "off") {
      return false;
    }
  }

  const globalRows = await db
    .select()
    .from(system_settings)
    .where(eq(system_settings.key, globalKey))
    .limit(1);

  if (globalRows.length > 0) {
    const raw = globalRows[0].value.toLowerCase();

    if (raw === "true" || raw === "1" || raw === "yes" || raw === "on") {
      return true;
    }

    if (raw === "false" || raw === "0" || raw === "no" || raw === "off") {
      return false;
    }
  }

  return defaultValue;
}

export async function getActiveStates(): Promise<State[]> {
  const rows = await db
    .select()
    .from(states)
    .where(and(eq(states.is_enabled, true), eq(states.ingestion_status, "ready")));

  return rows;
}
