import { db } from "@/db/client";
import { states } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureDelhiState } from "@/lib/states";

export async function ingestDelhiConstituencies(): Promise<void> {
  await ingestDelhiAssemblyList();
}

export async function ingestDelhiPoliticians(): Promise<void> {
  await ingestDelhiMLAsFromMyNeta();
  await ingestDelhiMPs();
  await ingestDelhiCouncillorsFromMyNeta();
}

export async function ingestDelhiCivicContacts(): Promise<void> {
  await ingestDelhiCivicContactsFromSites();
}

/**
 * Will ingest Delhi Assembly constituencies from:
 * - CEO Delhi AC LIST: https://www.ceodelhi.gov.in/AcListEng.aspx
 * - Form 20 data: https://data.opencity.in/dataset/delhi-assembly-elections-2025-form-20s
 */
async function ingestDelhiAssemblyList(): Promise<void> {}

/**
 * Will ingest Delhi MLAs from MyNeta:
 * - https://www.myneta.info/state_assembly.php?state=Delhi
 * - https://www.myneta.info/Delhi2025/
 */
async function ingestDelhiMLAsFromMyNeta(): Promise<void> {}

/**
 * Will ingest Delhi MPs and map them to Lok Sabha constituencies.
 * Sources:
 * - CEO Delhi "Know Your MP & MLA": https://www.ceodelhi.gov.in/KnowYourMP-MLA.aspx
 * - Election Commission of India results: https://results.eci.gov.in
 */
async function ingestDelhiMPs(): Promise<void> {}

/**
 * Will ingest Delhi MCD Councillors from:
 * - MyNeta Delhi Municipal 2022 winners: https://myneta.info/Delhi2022/index.php?action=show_winners
 * - MCD ward-wise results dataset: https://data.opencity.in/dataset/f1c512c4-5020-4086-8e4c-82dc78e0d1f6
 */
async function ingestDelhiCouncillorsFromMyNeta(): Promise<void> {}

/**
 * Will ingest civic contacts for Delhi from:
 * - MCD contact: https://mcdonline.nic.in/portal/contactUs
 * - NDMC contact: https://www.ndmc.gov.in/contact_us/contact_us.aspx
 */
async function ingestDelhiCivicContactsFromSites(): Promise<void> {}

export async function ingestDelhiRtiPortal(): Promise<void> {}

export async function runDelhiIngestion(): Promise<void> {
  const delhi = await ensureDelhiState();

  if (delhi.ingestion_status === "ingesting") {
    return;
  }

  await db
    .update(states)
    .set({ ingestion_status: "ingesting" })
    .where(eq(states.id, delhi.id));

  try {
    await ingestDelhiConstituencies();
    await ingestDelhiPoliticians();
    await ingestDelhiCivicContacts();

    await db
      .update(states)
      .set({ ingestion_status: "ready" })
      .where(eq(states.id, delhi.id));
  } catch (error) {
    console.error("Delhi ingestion failed", error);
    await db
      .update(states)
      .set({ ingestion_status: "error" })
      .where(eq(states.id, delhi.id));
  }
}
