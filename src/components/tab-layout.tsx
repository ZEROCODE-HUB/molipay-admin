import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

export type Tab = {
  label: string;
  to: string;
};

export function TabLayout({ tabs, children }: { tabs: Tab[]; children: ReactNode }) {
  const path = useRouterState({ select: (r) => r.location.pathname });

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => {
          const active = path === tab.to || path.startsWith(tab.to + "/");
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      <div>{children}</div>
    </div>
  );
}
