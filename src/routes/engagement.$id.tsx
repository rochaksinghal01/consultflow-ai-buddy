import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, StatusBadge } from "@/components/AppLayout";
import { toast } from "sonner";
import { Check, Loader2, Circle, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/engagement/$id")({ component: EngagementPage });

const STEPS = [
  { key: 1, name: "Discovery Analysis", desc: "Capturing client context & goals" },
  { key: 2, name: "Market Research", desc: "Industry data & competitive insights" },
  { key: 3, name: "Storyline Design", desc: "Narrative structure & slide outline" },
  { key: 4, name: "QA Review", desc: "Quality check & refinement" },
  { key: 5, name: "Deck Delivery", desc: "Final presentation ready for review" },
];

type Engagement = {
  id: string;
  client_name: string | null;
  project_name: string | null;
  status: string | null;
  current_step: number | null;
  research_summary: string | null;
  storyline_summary: string | null;
  requirements_json: any | null;
  research_brief: any | null;
  storyline_json: any | null;
  qa_feedback: string | null;
  delivery_url: string | null;
  presentation_id: string | null;
  revision_notes: string | null;
  revision_gate: number | null;
};

const REVISION_WEBHOOKS: Record<number, { url: string; extra?: Record<string, unknown> }> = {
  1: { url: "https://rochak01.app.n8n.cloud/webhook/research" },
  2: { url: "https://rochak01.app.n8n.cloud/webhook/storyline" },
  3: { url: "https://rochak01.app.n8n.cloud/webhook/qa-review" },
  4: { url: "https://rochak01.app.n8n.cloud/webhook/delivery" },
  5: { url: "https://rochak01.app.n8n.cloud/webhook/consultflow-approve", extra: { action: "revise" } },
};

function EngagementPage() {
  const { id } = Route.useParams();
  const [e, setE] = useState<Engagement | null>(null);
  const [tab, setTab] = useState<"research" | "storyline" | "qa" | "deck">("research");
  const [reviseOpen, setReviseOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [revisionNotes, setRevisionNotes] = useState("");
  const [resubmitting, setResubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("engagements").select("*").eq("id", id).maybeSingle();
      if (data) setE(data as Engagement);
    };
    load();
    const ch = supabase
      .channel(`engagement-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "engagements", filter: `id=eq.${id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  useEffect(() => {
    if (e?.delivery_url) setTab("deck");
  }, [e?.delivery_url]);

  if (!e) {
    return <AppLayout><div className="text-muted-foreground">Loading…</div></AppLayout>;
  }

  const current = e.current_step ?? 1;
  const isActive = !["delivered", "approved"].includes(e.status ?? "");

  const approve = async () => {
    await supabase.from("engagements").update({ status: "approved" }).eq("id", id);
    try {
      await fetch("https://rochak01.app.n8n.cloud/webhook/consultflow-approve", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engagement_id: id, action: "approve" }),
      });
    } catch {}
    toast.success("Deck approved");
  };

  const revise = async () => {
    if (!feedback.trim()) { toast.error("Add feedback first"); return; }
    await supabase.from("engagements").update({ status: "revision_requested", qa_feedback: feedback }).eq("id", id);
    try {
      await fetch("https://rochak01.app.n8n.cloud/webhook/consultflow-approve", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engagement_id: id, action: "revise", feedback }),
      });
    } catch {}
    toast.success("Revision requested");
    setReviseOpen(false); setFeedback("");
  };

  const resubmit = async () => {
    if (!revisionNotes.trim()) { toast.error("Add revision notes first"); return; }
    if (!e) return;
    setResubmitting(true);
    try {
      await supabase
        .from("engagements")
        .update({ revision_notes: revisionNotes, status: "in_review" })
        .eq("id", id);

      const gate = e.revision_gate ?? 0;
      const hook = REVISION_WEBHOOKS[gate];
      if (hook) {
        try {
          await fetch(hook.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ engagement_id: id, revision_notes: revisionNotes, ...(hook.extra ?? {}) }),
          });
        } catch {}
      }
      toast.success("Resubmitted for review");
      setRevisionNotes("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to resubmit");
    } finally {
      setResubmitting(false);
    }
  };

  return (
    <AppLayout>
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </Link>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--navy)]">{e.client_name}</h1>
          <p className="text-muted-foreground">{e.project_name}</p>
        </div>
        <StatusBadge status={e.status} />
      </div>

      {isActive && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--orange)]/10 border border-[var(--orange)]/30 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-[var(--orange)]" />
          <span className="text-foreground">Analysis in progress — step {current} of 5</span>
        </div>
      )}

      {e.status === "revision_requested" && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400 text-white text-sm font-bold">!</div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900">Revision Requested</h3>
              <p className="text-sm text-amber-800 mt-0.5">
                This engagement was sent back for changes. Add your feedback below and resubmit.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="revision-notes" className="block text-sm font-medium text-amber-900 mb-1.5">
              Revision Notes
            </label>
            <textarea
              id="revision-notes"
              rows={4}
              value={revisionNotes}
              onChange={(ev) => setRevisionNotes(ev.target.value)}
              placeholder="Describe what needs to change..."
              className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--navy)]/30"
            />
            <div className="mt-3 flex justify-end">
              <button
                onClick={resubmit}
                disabled={resubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--navy)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-60"
              >
                {resubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Resubmit for Review
              </button>
            </div>
          </div>
        </div>
      )}


      <div className="grid grid-cols-5 gap-6">
        {/* Stepper */}
        <div className="col-span-2 bg-card border border-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Progress</h2>
          <ol className="space-y-5">
            {STEPS.map((s, i) => {
              const done = current > s.key || e.status === "approved";
              const active = current === s.key && isActive;
              return (
                <li key={s.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
                      done ? "bg-[var(--navy)] text-white"
                      : active ? "bg-[var(--orange)] text-white pulse-ring"
                      : "bg-secondary text-muted-foreground"
                    }`}>
                      {done ? <Check className="w-4 h-4" /> : active ? <Loader2 className="w-4 h-4 animate-spin" /> : <Circle className="w-4 h-4" />}
                    </div>
                    {i < STEPS.length - 1 && <div className={`w-px flex-1 mt-1 ${done ? "bg-[var(--navy)]" : "bg-border"}`} style={{ minHeight: 24 }} />}
                  </div>
                  <div className="pb-3">
                    <div className={`font-medium ${active ? "text-[var(--orange)]" : done ? "text-foreground" : "text-muted-foreground"}`}>{s.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Output preview */}
        <div className="col-span-3 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
          <div className="flex border-b border-border">
            {[
              { k: "research", label: "Research" },
              { k: "storyline", label: "Storyline" },
              { k: "qa", label: "QA Feedback" },
              { k: "deck", label: "Deck" },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setTab(t.k as any)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition ${
                  tab === t.k ? "border-[var(--orange)] text-[var(--navy)]" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="p-6 flex-1 overflow-auto">
            {tab === "research" && <Markdown text={e.research_summary} placeholder="Research will appear here once Step 2 completes." />}
            {tab === "storyline" && <Markdown text={e.storyline_summary} placeholder="Storyline will appear here once Step 3 completes." />}
            {tab === "qa" && <Markdown text={e.qa_feedback} placeholder="QA feedback will appear here once Step 4 completes." />}
            {tab === "deck" && (
              e.delivery_url ? (
                <div>
                  <div className="aspect-video w-full rounded-lg overflow-hidden border border-border mb-4 bg-black">
                    <iframe src={e.delivery_url} className="w-full h-full" allowFullScreen />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={approve} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700">
                      ✓ Approve Deck
                    </button>
                    <button onClick={() => setReviseOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--orange)] text-white font-medium hover:opacity-90">
                      ↩ Request Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">Deck will be embedded here once delivered.</div>
              )
            )}
          </div>
        </div>
      </div>

      {reviseOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setReviseOpen(false)}>
          <div className="bg-card rounded-xl p-6 w-full max-w-lg" onClick={(ev) => ev.stopPropagation()}>
            <h3 className="font-semibold text-lg mb-3">Request changes</h3>
            <textarea
              rows={5}
              value={feedback}
              onChange={(ev) => setFeedback(ev.target.value)}
              placeholder="Describe what you'd like changed"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[var(--navy)]/30"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setReviseOpen(false)} className="px-4 py-2 rounded-lg border border-border text-sm">Cancel</button>
              <button onClick={revise} className="px-4 py-2 rounded-lg bg-[var(--orange)] text-white text-sm font-medium">Submit</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function Markdown({ text, placeholder }: { text: string | null; placeholder: string }) {
  if (!text) return <div className="text-muted-foreground text-sm">{placeholder}</div>;
  // lightweight md: headings, lists, paragraphs
  const lines = text.split("\n");
  return (
    <div className="prose prose-sm max-w-none text-foreground space-y-2">
      {lines.map((l, i) => {
        if (/^#\s/.test(l)) return <h2 key={i} className="text-lg font-bold text-[var(--navy)] mt-4">{l.replace(/^#\s/, "")}</h2>;
        if (/^##\s/.test(l)) return <h3 key={i} className="font-semibold mt-3">{l.replace(/^##\s/, "")}</h3>;
        if (/^[-*]\s/.test(l)) return <li key={i} className="ml-5 list-disc">{l.replace(/^[-*]\s/, "")}</li>;
        if (!l.trim()) return <div key={i} className="h-2" />;
        return <p key={i}>{l}</p>;
      })}
    </div>
  );
}
