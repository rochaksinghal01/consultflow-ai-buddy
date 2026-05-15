import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

const INTEGRATIONS = [
  { name: "Google Drive", desc: "Documents uploaded for RAG context", connected: true },
  { name: "Gmail", desc: "Auto-send decks to clients", connected: false },
  { name: "Slack", desc: "Approval notifications via Slack", connected: true },
  { name: "HubSpot", desc: "Sync client data automatically", connected: false },
];

const WORKFLOWS = [
  { name: "Discovery Analysis", lastRun: "2 min ago" },
  { name: "Market Research", lastRun: "5 min ago" },
  { name: "Storyline Design", lastRun: "12 min ago" },
  { name: "QA Review", lastRun: "1 hour ago" },
  { name: "Deck Delivery", lastRun: "3 hours ago" },
];

function SettingsPage() {
  const [primary, setPrimary] = useState("#1E3A64");
  const [accent, setAccent] = useState("#ED5029");
  const [active, setActive] = useState<Record<string, boolean>>(
    Object.fromEntries(WORKFLOWS.map((w) => [w.name, true]))
  );

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-[var(--navy)] mb-6">Settings</h1>

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Integrations</h2>
        <div className="grid grid-cols-2 gap-4">
          {INTEGRATIONS.map((i) => (
            <div key={i.name} className="bg-card border border-border rounded-xl p-5 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{i.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${i.connected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {i.connected ? "Connected" : "Coming Soon"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{i.desc}</p>
              </div>
              <button
                disabled={!i.connected}
                className="px-3 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Manage
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">n8n Workflows</h2>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Workflow</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Last Run</th>
              </tr>
            </thead>
            <tbody>
              {WORKFLOWS.map((w) => (
                <tr key={w.name} className="border-t border-border">
                  <td className="px-5 py-3 font-medium">{w.name}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => setActive((s) => ({ ...s, [w.name]: !s[w.name] }))}
                      className={`relative w-10 h-5 rounded-full transition ${active[w.name] ? "bg-[var(--orange)]" : "bg-slate-300"}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition ${active[w.name] ? "left-[22px]" : "left-0.5"}`} />
                    </button>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{w.lastRun}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Branding</h2>
        <div className="bg-card border border-border rounded-xl p-5 flex items-end gap-6">
          <div>
            <label className="block text-sm font-medium mb-1.5">Primary</label>
            <div className="flex items-center gap-2">
              <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="w-12 h-10 rounded border border-border" />
              <code className="text-sm">{primary}</code>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Accent</label>
            <div className="flex items-center gap-2">
              <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="w-12 h-10 rounded border border-border" />
              <code className="text-sm">{accent}</code>
            </div>
          </div>
          <button
            onClick={() => toast.success("Branding saved")}
            className="ml-auto px-5 py-2 rounded-lg bg-[var(--navy)] text-white text-sm font-medium hover:opacity-90"
          >
            Save Changes
          </button>
        </div>
      </section>
    </AppLayout>
  );
}
