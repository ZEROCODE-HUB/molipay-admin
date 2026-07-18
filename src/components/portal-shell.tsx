import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Menu, LogOut, MoreHorizontal, ChevronDown, type LucideIcon } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { MollyLogo } from "./molly-logo";
import { useDemoMode } from "@/contexts/demo-mode";

export type NavLeaf = { to: string; label: string; icon: LucideIcon };
export type NavGroup = { label: string; icon: LucideIcon; items: NavLeaf[] };
export type NavItem = NavLeaf | NavGroup;

const isGroup = (item: NavItem): item is NavGroup =>
  (item as NavGroup).items !== undefined;

const flattenLeaves = (nav: NavItem[]): NavLeaf[] =>
  nav.flatMap((i) => (isGroup(i) ? i.items : [i]));

export function PortalShell({
  nav,
  title,
  children,
}: {
  nav: NavItem[];
  title: string;
  children: ReactNode;
}) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [open, setOpen] = useState(false);
  const { setRole } = useDemoMode();
  const navigate = useNavigate();

  const leaves = useMemo(() => flattenLeaves(nav), [nav]);
  const mainNav = leaves.slice(0, 4);
  const more = leaves.slice(4);

  const onLogout = () => {
    setRole(null);
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b bg-card flex items-center justify-between px-4 lg:px-6 shrink-0">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden p-2 -ml-2"
            onClick={() => setOpen((v) => !v)}
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>
          <MollyLogo />
          <span className="hidden md:inline text-sm text-muted-foreground border-l pl-3 ml-1">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-xs text-muted-foreground">Sesión demo</span>
            <span className="text-sm font-semibold">Empresa Demo SA</span>
          </div>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
            style={{ background: "var(--brand-soft)", color: "var(--brand-dark)" }}
          >
            ED
          </div>
          <button
            onClick={onLogout}
            className="hidden md:inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <LogOut size={14} /> Salir
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar desktop */}
        <aside className="hidden lg:flex flex-col w-60 border-r bg-sidebar shrink-0">
          <nav className="p-3 flex-1 overflow-y-auto">
            <SidebarNav nav={nav} path={path} />
          </nav>
        </aside>

        {/* Sidebar mobile drawer */}
        {open && (
          <div className="lg:hidden fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar border-r flex flex-col">
              <div className="p-4 border-b">
                <MollyLogo />
              </div>
              <nav className="p-3 flex-1 overflow-y-auto">
                <SidebarNav nav={nav} path={path} onNavigate={() => setOpen(false)} />
              </nav>
            </aside>
          </div>
        )}

        {/* Main */}
        <main className="flex-1 min-w-0 overflow-y-auto pb-20 lg:pb-6">
          <div className="max-w-[1400px] mx-auto p-4 md:p-6 lg:px-10 lg:py-8">{children}</div>
        </main>

      </div>

      {/* Bottom nav mobile */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-card border-t flex items-stretch z-30">
        {mainNav.map((item) => {
          const active = path === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] ${
                active ? "text-primary font-semibold" : "text-muted-foreground"
              }`}
            >
              <Icon size={20} strokeWidth={1.75} />
              <span className="truncate px-1">{item.label}</span>
            </Link>
          );
        })}
        {more.length > 0 && (
          <button
            onClick={() => setOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] text-muted-foreground"
          >
            <MoreHorizontal size={20} strokeWidth={1.75} />
            <span>Más</span>
          </button>
        )}
      </nav>
    </div>
  );
}

function SidebarNav({
  nav,
  path,
  onNavigate,
}: {
  nav: NavItem[];
  path: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {nav.map((item, idx) =>
        isGroup(item) ? (
          <SidebarGroup key={`g-${idx}-${item.label}`} group={item} path={path} onNavigate={onNavigate} />
        ) : (
          <SidebarLink key={item.to} item={item} active={path === item.to} onNavigate={onNavigate} />
        )
      )}
    </>
  );
}

function SidebarLink({
  item,
  active,
  onNavigate,
  nested = false,
}: {
  item: NavLeaf;
  active: boolean;
  onNavigate?: () => void;
  nested?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm mb-0.5 transition-colors ${
        nested ? "pl-9" : ""
      } ${
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60"
      }`}
    >
      {!nested && <Icon size={18} strokeWidth={1.75} />}
      {nested && <Icon size={15} strokeWidth={1.75} className="opacity-70" />}
      {item.label}
    </Link>
  );
}

function SidebarGroup({
  group,
  path,
  onNavigate,
}: {
  group: NavGroup;
  path: string;
  onNavigate?: () => void;
}) {
  const containsActive = group.items.some((i) => i.to === path);
  const [open, setOpen] = useState(containsActive);
  const Icon = group.icon;
  const expanded = open || containsActive;
  return (
    <div className="mb-0.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
          containsActive
            ? "text-sidebar-accent-foreground font-semibold"
            : "text-sidebar-foreground hover:bg-sidebar-accent/60"
        }`}
        aria-expanded={expanded}
      >
        <Icon size={18} strokeWidth={1.75} />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded && (
        <div className="mt-0.5">
          {group.items.map((it) => (
            <SidebarLink
              key={it.to}
              item={it}
              active={path === it.to}
              onNavigate={onNavigate}
              nested
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* Utility primitives used by pages */

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-card border rounded-lg p-6 ${className}`}>{children}</div>;
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl md:text-3xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </Card>
  );
}

export function BtnPrimary({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition ${p.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function BtnOutline({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md border border-border bg-card text-foreground text-sm font-semibold hover:bg-accent transition ${p.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function Input(p: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...p}
      className={`w-full h-10 px-3 rounded-md border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring ${p.className ?? ""}`}
    />
  );
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-semibold text-foreground mb-1.5 block">
      {children}
    </label>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warn" | "danger" }) {
  const styles: Record<string, string> = {
    neutral: "bg-muted text-muted-foreground",
    success: "bg-[color:var(--brand-soft)] text-[color:var(--brand-dark)]",
    warn: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${styles[tone]}`}>
      {children}
    </span>
  );
}
