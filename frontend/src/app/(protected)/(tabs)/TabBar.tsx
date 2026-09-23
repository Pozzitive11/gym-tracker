"use client";

import { BarChart3, Dumbbell, ListChecks } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Тренування", icon: Dumbbell },
  { href: "/progress", label: "Прогрес", icon: BarChart3 },
  { href: "/exercises", label: "Вправи", icon: ListChecks },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-none gap-1 border-t border-line bg-bg/85 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+10px)] backdrop-blur-xl">
      {TABS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 py-2 text-micro font-medium transition-colors ${
              isActive ? "text-accent" : "text-dim-2"
            }`}
          >
            <Icon size={22} strokeWidth={1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
