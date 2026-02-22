import { db } from "../src/db/client";
import { states, users } from "../src/db/schema";
import { ensureDelhiState } from "../src/lib/states";
import { eq } from "drizzle-orm";
import { runDelhiIngestion } from "../src/lib/ingest/delhi";
import { seedDelhiCore } from "../src/lib/seed/delhiCore";

async function ensureAdminUser() {
  const phone = process.env.DEV_ADMIN_PHONE;
  const email = process.env.DEV_ADMIN_EMAIL;
  const firebaseUid = process.env.DEV_ADMIN_FIREBASE_UID ?? "dev-admin-firebase-uid";

  if (!phone && !email) {
    throw new Error("DEV_ADMIN_PHONE or DEV_ADMIN_EMAIL must be set");
  }

  let existingUser = null;

  if (phone) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phone_number, phone))
      .limit(1);

    if (user) {
      existingUser = user;
    }
  }

  if (!existingUser && email) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user) {
      existingUser = user;
    }
  }

  if (existingUser) {
    const [updated] = await db
      .update(users)
      .set({ is_system_admin: true, state_code: "DL" })
      .where(eq(users.id, existingUser.id))
      .returning();

    return updated;
  }

  const [created] = await db
    .insert(users)
    .values({
      phone_number: phone ?? "0000000000",
      firebase_uid: firebaseUid,
      email: email ?? null,
      state_code: "DL",
      is_system_admin: true
    })
    .returning();

  return created;
}

async function main() {
  const delhi = await ensureDelhiState();

  const adminUser = await ensureAdminUser();

  await runDelhiIngestion();
  await seedDelhiCore();

  await db
    .update(states)
    .set({ ingestion_status: "ready", is_enabled: true })
    .where(eq(states.id, delhi.id));

  console.log(`Admin user id: ${adminUser.id}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
