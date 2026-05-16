import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, DeckTypeBadge, StatusBadge } from "@/components/AppLayout";
import { Plus, Eye, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({ component: Dashboard });

type Engagement = {
  id: string;
  client_name: string | null;
  project_name: string | null;
  deck_type: string | null;
  status: string | null;
  current_step: number | null;
  created_at: string;
};

function Dashboard() {
  const [rows, setRows] = useState<Engagement[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Delete engagement "${label}"? This cannot be undone.`)) return;
    setDeletingId(id);
    const { error } = await supabase.from("engagements").delete().eq("id", id);
    setDeletingId(null);
    if (error) { toast.error(error.message); return; }
    setRows((prev) => prev?.filter((r) => r.id !== id) ?? prev);
    toast.success("Engagement deleted");
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("engagements")
        .select("id,client_name,project_name,deck_type,status,current_step,created_at")
        .order("created_at", { ascending: false });
      if (active) setRows(data ?? []);
    };
    load();

    const channel = supabase
      .channel("engagements-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "engagements" }, () => load())
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, []);

  const total = rows?.length ?? 0;
  const inProgress = rows?.filter(r => r.status && !["delivered","approved"].includes(r.status)).length ?? 0;
  const delivered = rows?.filter(r => r.status === "delivered").length ?? 0;
  const approved = rows?.filter(r => r.status === "approved").length ?? 0;

  const stats = [
    { label: "Total", value: total, color: "text-[var(--navy)]" },
    { label: "In Progress", value: inProgress, color: "text-blue-600" },
    { label: "Delivered", value: delivered, color: "text-emerald-600" },
    { label: "Approved", value: approved, color: "text-green-700" },
  ];

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--navy)]">Active Engagements</h1>
        <Link
          to="/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" /> New Engagement
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</div>
            <div className={`text-3xl font-bold mt-2 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left">
            <tr>
              {["Client", "Deck Type", "Status", "Step", "Created", ""].map((h) => (
                <th key={h} className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows === null && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {rows && rows.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No engagements yet. Create your first one.</td></tr>
            )}
            {rows?.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-secondary/50">
                <td className="px-5 py-3">
                  <div className="font-medium text-foreground">{r.client_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.project_name}</div>
                </td>
                <td className="px-5 py-3"><DeckTypeBadge type={r.deck_type} /></td>
                <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-5 py-3 text-muted-foreground">{r.current_step ?? 1} of 5</td>
                <td className="px-5 py-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="px-5 py-3 text-right">
                  <Link
                    to="/engagement/$id"
                    params={{ id: r.id }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border text-xs font-medium hover:bg-secondary"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
