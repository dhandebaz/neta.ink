import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";

// Manually load .env
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf-8");
    envConfig.split("\n").forEach((line) => {
      const [key, ...value] = line.split("=");
      if (key && value) {
        process.env[key.trim()] = value.join("=").trim();
      }
    });
  } else {
    console.warn("⚠️ .env file not found. Ensure DATABASE_URL is set in your environment.");
  }
} catch (e) {
  console.warn("Could not load .env file", e);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL is not set. Please create a .env file or set the environment variable.");
  process.exit(1);
}

const sql = neon(connectionString);
const db = drizzle(sql);

async function main() {
  const args = process.argv.slice(2);
  const phoneNumber = args[0];

  if (!phoneNumber) {
    console.log("\nUsage: npx tsx scripts/promote_admin.ts <PHONE_NUMBER>");
    console.log("Example: npx tsx scripts/promote_admin.ts +919999999999\n");
    
    // List existing users to help
    console.log("Fetching existing users...");
    const allUsers = await db.select().from(users);
    if (allUsers.length === 0) {
      console.log("No users found in the database.");
    } else {
      console.table(allUsers.map(u => ({ id: u.id, name: u.name, phone: u.phone_number, isAdmin: u.is_system_admin })));
    }
    process.exit(0);
  }

  console.log(`Searching for user with phone: ${phoneNumber}...`);
  const [user] = await db.select().from(users).where(eq(users.phone_number, phoneNumber)).limit(1);

  if (!user) {
    console.error(`❌ User with phone number ${phoneNumber} not found.`);
    process.exit(1);
  }

  console.log(`Found user: ${user.name || "Unnamed"} (ID: ${user.id})`);
  
  if (user.is_system_admin) {
    console.log("✅ This user is already a system admin.");
  } else {
    console.log("Promoting to system admin...");
    await db.update(users).set({ is_system_admin: true }).where(eq(users.id, user.id));
    console.log("✅ User promoted successfully!");
  }

  console.log(`\n🎉 You can now access the admin dashboard at:\n   /system?adminUserId=${user.id}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
