import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of service – neta",
  description:
    "Simple terms describing what neta does, what it does not guarantee, and how payments work.",
  openGraph: {
    type: "website",
    url: "https://neta.ink/terms",
    title: "Terms of service – neta",
    description:
      "Read the key terms that apply when you use neta to draft RTIs, file complaints, and view information about representatives.",
    images: ["/og-default.jpg"]
  }
};

export default function TermsPage() {
  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
          Terms of service
        </h1>
        <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
          These terms are a plain-language summary of how neta works today. They do not replace any
          rights you have under Indian law.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Acceptance</h2>
        <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          By accessing or using neta, you agree to these terms and to comply with all applicable
          laws and regulations, including local laws where you live and the laws of India. If you do
          not agree, you should not use the service.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Service description</h2>
        <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          neta provides tools that help you:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
          <li>draft RTI applications under the RTI Act 2005 using AI-generated suggestions,</li>
          <li>draft and send civic complaints using structured flows and email where configured,</li>
          <li>view information, rankings, and summaries about elected representatives.</li>
        </ul>
        <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          The app is intended as a helper for citizens. It does not replace legal advice and is not
          a law firm or an agent of any government body.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">No guarantees</h2>
        <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          neta does not guarantee any particular outcome. In particular:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
          <li>no authority or representative is required to respond to an RTI or complaint;</li>
          <li>data from public and third-party sources may contain errors or be incomplete;</li>
          <li>AI-generated drafts may need correction or adaptation to your specific situation.</li>
        </ul>
        <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          You should review everything before sending it in your own name and rely on your own
          judgment or independent advice where needed.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Responsibility</h2>
        <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          You are responsible for the content you submit, send, or download using neta. This
          includes:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
          <li>ensuring that RTIs and complaints you send are accurate and lawful,</li>
          <li>avoiding defamatory, abusive, or illegal content,</li>
          <li>complying with any confidentiality or privacy obligations you may have.</li>
        </ul>
        <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          If you share information about other people, you should do so only where you are
          permitted to and where it is necessary for the complaint or RTI.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Payments</h2>
        <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          For certain tasks, including RTI drafting and complaint processing, neta may charge a fee,
          such as ₹11 per task. These fees cover the cost of AI, infrastructure, payment processing,
          and related services needed to operate the platform.
        </p>
        <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Fees do not buy influence and do not guarantee any government response, resolution, or
          legal outcome. Unless required by applicable law or stated otherwise in a specific flow,
          fees are generally non-refundable once processing has started.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Changes</h2>
        <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          neta may update these terms as the product evolves or as laws change. When that happens,
          the latest version will be posted on this page. If you continue to use the service after
          changes take effect, you are agreeing to the updated terms.
        </p>
      </section>
    </main>
  );
}

