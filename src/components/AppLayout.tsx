import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Plus, Settings } from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/new", icon: Plus, label: "New Engagement" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className="w-16 shrink-0 bg-[var(--navy)] flex flex-col items-center py-5 gap-2">
        <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center mb-3">
          <span className="text-white font-bold text-sm">CF</span>
        </div>
        {nav.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              title={item.label}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                active
                  ? "bg-[var(--orange)] text-white"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-8">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-[var(--navy)]">ConsultFlow AI</span>
            <span className="w-2 h-2 rounded-full bg-[var(--orange)]" />
          </div>
          <span className="text-sm text-muted-foreground">demo@consultflow.ai</span>
        </header>
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

export const DECK_TYPES = {
  strategy: { label: "Strategy", color: "bg-blue-100 text-blue-700 border-blue-200", icon: "🎯" },
  due_diligence: { label: "Due Diligence", color: "bg-purple-100 text-purple-700 border-purple-200", icon: "🔍" },
  fundraising: { label: "Fundraising", color: "bg-green-100 text-green-700 border-green-200", icon: "💰" },
  operational: { label: "Operational", color: "bg-orange-100 text-orange-700 border-orange-200", icon: "⚙️" },
} as const;

export const STATUS_COLORS: Record<string, string> = {
  discovery: "bg-slate-100 text-slate-700",
  research: "bg-blue-100 text-blue-700",
  storyline: "bg-indigo-100 text-indigo-700",
  qa_review: "bg-amber-100 text-amber-700",
  delivered: "bg-emerald-100 text-emerald-700",
  approved: "bg-green-200 text-green-800",
  revision_requested: "bg-orange-100 text-orange-700",
};

export function DeckTypeBadge({ type }: { type: string | null }) {
  const t = DECK_TYPES[type as keyof typeof DECK_TYPES];
  if (!t) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border ${t.color}`}>
      <span>{t.icon}</span> {t.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${STATUS_COLORS[status] ?? "bg-slate-100 text-slate-700"}`}>
      {status.replace("_", " ")}
    </span>
  );
}
