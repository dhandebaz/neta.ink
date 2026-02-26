import Link from "next/link";
import { ArrowRight, FileText, Scale, Megaphone, Code } from "lucide-react";

export const metadata = {
  title: "Civic Toolstore",
  description: "Powerful tools for Indian citizens to hold power accountable.",
};

const apps = [
  {
    title: "AI RTI Drafter",
    description: "Draft and mail legal RTIs in 30 seconds.",
    href: "/rti",
    icon: FileText,
    color: "bg-blue-500",
    textColor: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    disabled: false,
  },
  {
    title: "Complaint Engine",
    description: "AI detects department and auto-mails officials.",
    href: "/complaints",
    icon: Megaphone,
    color: "bg-emerald-500",
    textColor: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    disabled: false,
  },
  {
    title: "Neta Compare",
    description: "Head-to-head comparison of politicians' criminal and asset records.",
    href: "/compare",
    icon: Scale,
    color: "bg-amber-500",
    textColor: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    disabled: false,
  },
  {
    title: "Developer Portal",
    description: "Build your own civic app using the Neta API. Subject to manual review.",
    href: "#",
    icon: Code,
    color: "bg-purple-500",
    textColor: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    disabled: true,
  },
];

export default function ToolstorePage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Civic Toolstore
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
          A suite of digital tools designed to empower every Indian citizen.
          File RTIs, report issues, and verify leaders instantly.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((app) => (
          <div
            key={app.title}
            className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950 ${
              app.disabled ? "opacity-70 grayscale pointer-events-none" : ""
            }`}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900">
              <app.icon className={`h-6 w-6 ${app.textColor}`} />
            </div>
            
            <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
              {app.title}
            </h3>
            
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
              {app.description}
            </p>

            {app.disabled ? (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                Coming Soon
              </span>
            ) : (
              <Link
                href={app.href}
                className={`inline-flex items-center gap-2 text-sm font-medium ${app.textColor} hover:underline`}
              >
                Launch App <ArrowRight className="h-4 w-4" />
                <span className="absolute inset-0" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
