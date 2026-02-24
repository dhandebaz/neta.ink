import { db } from "@/db/client";
import { system_settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function DevNotesPage() {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const rows = await db
    .select()
    .from(system_settings)
    .where(eq(system_settings.key, "dummy"))
    .limit(0);

  rows.toString();

  const lines = [
    "Local setup:",
    "- npm run db:generate",
    "- npm run db:push",
    "- npm run db:bootstrap",
    "",
    "Admin access:",
    "- Use the admin phone or email configured in DEV_ADMIN_PHONE / DEV_ADMIN_EMAIL.",
    "- NEXT_PUBLIC_DEV_ADMIN_ID should be set to the admin user id for the /system shortcut.",
    "",
    "Environment variables:",
    "- DATABASE_URL: Neon or Postgres connection string.",
    "- GEMINI_API_KEY or GOOGLE_API_KEY: Gemini AI text models.",
    "- HYPERBROWSER_API_KEY: optional Hyperbrowser agent access.",
    "- RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET: Razorpay integration.",
    "- COMPLAINTS_FALLBACK_EMAIL, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS: email sending.",
    "- NEXT_PUBLIC_SHOW_DEV_OVERLAY: enable dev overlay when set to 'true'.",
    "- NEXT_PUBLIC_DEV_ADMIN_ID: admin id used for the Dev admin link.",
    "",
    "Admin UI:",
    "- /system shows Delhi state status, data overview, and usage metrics.",
    "- Access is guarded by is_system_admin on the users table."
  ];

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Developer notes</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Internal documentation for local and staging setup.
          </p>
        </header>
        <section className="space-y-2 text-sm text-slate-800 dark:text-slate-100">
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>
      </div>
    </main>
  );
}

