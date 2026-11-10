import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

export type Tab = {
  label: string;
  to: string;
  /** Pendientes de atender; se muestra si es mayor a 0. */
  badge?: number;
};

function matchesPath(path: string, to: string) {
  return path === to || path.startsWith(to + "/");
}

export function TabLayout({ tabs, children }: { tabs: Tab[]; children: ReactNode }) {
  const path = useRouterState({ select: (r) => r.location.pathname });

  const active = tabs.reduce<string | null>((best, tab) => {
    const matches = matchesPath(path, tab.to);
    const moreSpecific = best && tab.to.length > best.length;
    return matches && (best === null || moreSpecific) ? tab.to : best;
  }, null);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => {
          const activeTab = active === tab.to;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab
                  ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {!!tab.badge && tab.badge > 0 && (
                <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-5 text-primary-foreground">
                  {tab.badge > 99 ? "99+" : tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      <div>{children}</div>
    </div>
  );
}
