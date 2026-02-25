"use client";

import { Home, Scale, HeartHandshake, User } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export function MobileBottomNav() {
  const pathname = usePathname();

  const links = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/compare", icon: Scale, label: "Compare" },
    { href: "/volunteer", icon: HeartHandshake, label: "Act" },
    { href: "/dashboard", icon: User, label: "Profile" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-2 pb-safe sm:hidden">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-col items-center justify-center ${
              isActive ? "text-amber-500" : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <Icon className="h-6 w-6" />
            <span className="text-xs mt-1">{link.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
