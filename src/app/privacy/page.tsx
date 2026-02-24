import type { Metadata } from "next";

const contactEmail = process.env.CONTACT_EMAIL || "support@example.com";

export const metadata: Metadata = {
  title: "Privacy policy – neta",
  description:
    "How neta collects, stores, and uses data to provide RTI drafting, civic complaints, and representative information.",
  openGraph: {
    type: "website",
    url: "https://neta.ink/privacy",
    title: "Privacy policy – neta",
    description:
      "Learn what data neta collects, how it is stored in the cloud, how it is used, and how it is shared with authorities and service providers.",
    images: ["/og-default.jpg"]
  }
};

export default function PrivacyPage() {
  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
          Privacy policy
        </h1>
        <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
          This page explains, in simple terms, how neta handles the data you share when using the
          app today.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Data we collect</h2>
        <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          neta collects different types of data so that it can provide RTI and complaint flows and
          show you your own history.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
          <li>
            <span className="font-semibold">Account data:</span> your phone number is required to
            use the service. You can optionally provide a name and email address to make drafts and
            communications clearer.
          </li>
          <li>
            <span className="font-semibold">Usage and content:</span> RTI questions, complaint
            descriptions, photos, locations, and related metadata such as severity, department, and
            timestamps.
          </li>
          <li>
            <span className="font-semibold">Technical data:</span> limited technical information
            such as IP addresses, device details, and logs may be collected for security,
            rate-limiting, fraud prevention, and reliability.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">How data is stored</h2>
        <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Data is stored in managed cloud infrastructure:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
          <li>
            A managed Postgres database, such as a Neon-hosted instance, holds structured data about
            users, complaints, RTIs, and representatives.
          </li>
          <li>
            Encrypted object storage, such as Cloudflare R2, is used for files like complaint
            photos.
          </li>
          <li>
            Access to these systems is restricted to the small neta team members who need it to
            operate, secure, and improve the service.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">How data is used</h2>
        <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Data is used for specific, limited purposes:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
          <li>to draft and store RTIs and civic complaints that you initiate,</li>
          <li>to show your own history, such as “My RTIs” and “My complaints”,</li>
          <li>to compute anonymous or aggregated statistics and rankings about representatives,</li>
          <li>to protect against abuse, spam, and misuse of the platform.</li>
        </ul>
        <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          AI models may process your inputs (for example, RTI questions or complaint descriptions)
          in order to generate drafts. These models are used as processors and are not intended to
          use your data to build profiles for advertising.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Sharing</h2>
        <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          neta shares data only in ways that are necessary to deliver the service:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
          <li>
            With authorities and civic bodies you choose to contact, for example via complaint
            emails that include your description of an issue and your contact details.
          </li>
          <li>
            With third-party processors that provide infrastructure, such as email providers,
            payment gateways, storage services, analytics, and AI platforms.
          </li>
        </ul>
        <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          neta does not sell user data to advertisers. Data is not shared with political campaigns
          or parties for targeting.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Retention</h2>
        <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          In general, complaints, RTIs, and related account data are kept for as long as your
          account exists, so that you can see your history and so that the system can compute
          aggregate statistics. Certain data may be retained for longer where required by law or for
          legitimate security, fraud prevention, or record-keeping needs.
        </p>
        <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          If you stop using the service and wish to request changes to how your data is handled, you
          can reach out using the contact details below, subject to legal and technical limits.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Contact</h2>
        <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          If you have questions about this policy or how your data is handled, you can email the
          neta team at{" "}
          <a href={`mailto:${contactEmail}`} className="text-amber-600 dark:text-amber-300 hover:underline">
            {contactEmail}
          </a>
          .
        </p>
      </section>
    </main>
  );
}

