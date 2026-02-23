import type { Metadata } from "next";

type FaqItem = {
  question: string;
  answer: string[];
};

export const metadata: Metadata = {
  title: "FAQ – neta civic accountability tool",
  description:
    "Answers to common questions about how neta works, its independence, state coverage, AI drafting, fees, and data.",
  openGraph: {
    type: "website",
    url: "https://neta.ink/faq",
    title: "FAQ – neta civic accountability tool",
    description:
      "Learn how neta uses AI, email, and payments to support RTIs and civic complaints, and what its limits are today.",
    images: ["/og-default.jpg"]
  }
};

const items: FaqItem[] = [
  {
    question: "Is neta affiliated with any political party or government?",
    answer: [
      "No. neta is independent and is not affiliated with any political party, candidate, or government body.",
      "The goal is to provide neutral tools that help citizens understand and engage with their elected representatives, regardless of who is in power."
    ]
  },
  {
    question: "Which states does neta currently support?",
    answer: [
      "The app is designed for all Indian states, but the first live phase is focused on Delhi.",
      "Delhi currently has the most complete flows: RTI drafting, civic complaints that are routed towards the right bodies where configured, and rankings for representatives.",
      "Other states will be added gradually as data and infrastructure are ready."
    ]
  },
  {
    question: "How are RTIs drafted?",
    answer: [
      "When you describe your question, neta uses AI to generate a draft RTI under the RTI Act 2005, typically aligned with Section 6(1).",
      "The draft includes a suggested body of the RTI, an addressee, and filing instructions. It is always shown to you in full and can be edited before you decide what to do with it.",
      "neta does not file RTIs on your behalf and does not pay the statutory RTI fee for you. You remain responsible for filing through official portals or channels such as https://rtionline.gov.in or the relevant state mechanisms."
    ]
  },
  {
    question: "How are complaints sent?",
    answer: [
      "For civic complaints, neta helps you turn photos and descriptions into structured complaints that include location, severity, and a clear narrative of the issue.",
      "Based on the state and configuration, the app can prepare complaint emails that use real civic contact details where available or a configured civic inbox. Your details are included so that authorities can respond to you directly.",
      "When email sending is configured, status updates may come from email replies to you or the configured mailbox. neta itself cannot guarantee that any authority will respond or resolve the issue."
    ]
  },
  {
    question: "Why is there a ₹11 fee?",
    answer: [
      "The ₹11 fee covers the cost of AI processing, payment processing, and the infrastructure needed to store and route your RTIs and complaints.",
      "This fee does not buy influence and does not guarantee any government action, response, or outcome. It is a contribution towards the cost of running the service."
    ]
  },
  {
    question: "How is my data stored?",
    answer: [
      "Your account and content data are stored in a managed cloud database, such as a hosted Postgres instance, and in encrypted object storage for uploaded files like complaint photos.",
      "Technical logs, including IP addresses, may be recorded for security, rate-limiting, and abuse prevention.",
      "For more detail on how data is collected, stored, and shared, see the Privacy page."
    ]
  },
  {
    question: "Can I use neta outside Delhi?",
    answer: [
      "The full live flows for RTIs and civic complaints are currently focused on Delhi.",
      "You may still be able to browse available data, rankings, and structures for other states as they are added, but filing flows will be phased in gradually.",
      "Even in Delhi, there is no promise that a particular authority will respond; the tool helps you draft and route issues, but outcomes depend on the public bodies involved."
    ]
  }
];

export default function FaqPage() {
  return (
    <main className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
          Frequently asked questions
        </h1>
        <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
          Straightforward answers about what neta does, what it does not do, and how it works
          today.
        </p>
      </section>
      <section className="space-y-3">
        {items.map((item) => (
          <details
            key={item.question}
            className="group rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 px-4 py-3"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
              <span>{item.question}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 group-open:hidden">Show</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 hidden group-open:inline">Hide</span>
            </summary>
            <div className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              {item.answer.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </details>
        ))}
      </section>
    </main>
  );
}

