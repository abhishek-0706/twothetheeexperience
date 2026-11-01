"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/ui/Icon";

const TABS = [
  { href: "/hub", icon: "dashboard", label: "Hub" },
  { href: "/studio", icon: "auto_awesome", label: "Studio" },
  { href: "/budget", icon: "account_balance_wallet", label: "Budget" },
  { href: "/timeline", icon: "calendar_today", label: "Timeline" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-50 px-margin py-2 bg-surface/90 backdrop-blur-lg rounded-full border border-secondary/20 shadow-lg"
    >
      <ul className="flex justify-around items-center">
        {TABS.map((tab) => {
          const isActive = pathname?.startsWith(tab.href) ?? false;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-3 py-1.5 rounded-full transition-all duration-150 active:scale-95 ${
                  isActive
                    ? "bg-secondary-fixed/30 text-primary font-semibold"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                <Icon name={tab.icon} className="text-[20px]" filled={isActive} />
                <span className="text-label-sm font-label-sm mt-0.5">{tab.label}</span>
                {isActive && (
                  <span aria-hidden="true" className="w-1 h-1 rounded-full bg-secondary mt-0.5" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
