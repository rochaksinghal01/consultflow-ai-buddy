import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, StatusBadge } from "@/components/AppLayout";
import { toast } from "sonner";
import { Check, Loader2, Circle, ArrowLeft, ThumbsUp, ThumbsDown, ExternalLink } from "lucide-react";
import { WEBHOOKS } from "@/config/webhooks";

export const Route = createFileRoute("/engagement/$id")({ component: EngagementPage });

const STEPS = [
  { key: 1, name: "Discovery Analysis",  desc: "Capturing client context & goals" },
  { key: 2, name: "Market Research",     desc: "Industry data & competitive insights" },
  { key: 3, name: "Storyline Design",    desc: "Narrative structure & slide outline" },
  { key: 4, name: "QA Review",           desc: "Quality check & refinement" },
  { key: 5, name: "Deck Delivery",       desc: "Final presentation ready for review" },
];

// Derive pipeline step from status
const STATUS_STEP: Record<string, number> = {
  discovery: 1,
  research: 2,
  storyline_review: 3,
  final_review: 4,
  draft_review: 4,
  delivered: 5,
  approved: 5,
};

type GateConfig = {
  gate: number;
  label: string;
  description: string;
  approveWebhook: string;
  declineWebhook: string;
};

// When status = key, this gate is pending
const GATE_CONFIG: Record<string, GateConfig> = {
  research: {
    gate: 1,
    label: "Gate 1 — Requirements Review",
    description: "Review the AI-extracted engagement brief. Approve to kick off market research, or decline with feedback to refine.",
    approveWebhook: WEBHOOKS.research,
    declineWebhook: WEBHOOKS.discovery,
  },
  storyline_review: {
    gate: 2,
    label: "Gate 2 — Research Review",
    description: "Review the market research brief. Approve to begin storyline design, or decline with feedback.",
    approveWebhook: WEBHOOKS.storyline,
    declineWebhook: WEBHOOKS.research,
  },
  final_review: {
    gate: 3,
    label: "Gate 3 — Storyline Review",
    description: "Review the deck storyline and slide structure. Approve to begin QA review, or decline with feedback.",
    approveWebhook: WEBHOOKS.qa,
    declineWebhook: WEBHOOKS.storyline,
  },
  draft_review: {
    gate: 4,
    label: "Gate 4 — QA Review",
    description: "Review the QA report. Approve to generate the final deck, or decline with feedback.",
    approveWebhook: WEBHOOKS.delivery,
    declineWebhook: WEBHOOKS.qa,
  },
};

type Engagement = {
  id: string;
  client_name: string | null;
  project_name: string | null;
  industry: string | null;
  deck_type: string | null;
  status: string | null;
  requirements_json: any | null;
  research_brief: any | null;
  storyline_json: any | null;
  quality_report: any | null;
  output_slides_url: string | null;
  revision_notes: string | null;
  revision_gate: number | null;
  engagement_goal: string | null;
  timeline: string | null;
};

function EngagementPage() {
  const { id } = Route.useParams();
  const [e, setE] = useState<Engagement | null>(null);
  const [tab, setTab] = useState<"brief" | "research" | "storyline" | "qa" | "deck">("brief");

  // Gate panel state
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineFeedback, setDeclineFeedback] = useState("");
  const [gateSubmitting, setGateSubmitting] = useState(false);

  // Revision resubmit state
  const [revisionNotes, setRevisionNotes] = useState("");
  const [resubmitting, setResubmitting] = useState(false);

  // Final deck revision
  const [deckReviseOpen, setDeckReviseOpen] = useState(false);
  const [deckFeedback, setDeckFeedback] = useState("");

  // Post-approve processing state
  const [processingAfterApproval, setProcessingAfterApproval] = useState(false);

  // Polling for status updates (fallback for unreliable realtime)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPolling = (fromStatus: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      const { data } = await supabase.from("engagements").select("*").eq("id", id).maybeSingle();
      if (data && data.status !== fromStatus) {
        setE(data as Engagement);
        setProcessingAfterApproval(false);
        if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      }
    }, 3000);
    // Stop polling after 10 minutes
    setTimeout(() => {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    }, 600000);
  };

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("engagements").select("*").eq("id", id).maybeSingle();
      if (data) {
        setE(data as Engagement);
        // Auto-poll if n8n is still processing (so Gate 1 appears without refresh)
        if (data.status === "discovery") startPolling("discovery");
      }
    };
    load();
    const ch = supabase
      .channel(`engagement-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "engagements", filter: `id=eq.${id}` }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    };
  }, [id]);

  // Auto-switch the right panel tab to match the current gate's content
  const STATUS_TO_TAB: Record<string, "brief" | "research" | "storyline" | "qa" | "deck"> = {
    research:        "brief",      // Gate 1 — review discovery brief
    storyline_review:"research",   // Gate 2 — review research
    final_review:    "storyline",  // Gate 3 — review storyline
    draft_review:    "qa",         // Gate 4 — review QA report
    delivered:       "deck",
    approved:        "deck",
  };
  useEffect(() => {
    if (!e?.status) return;
    const target = STATUS_TO_TAB[e.status];
    if (target) setTab(target);
  }, [e?.status]);

  if (!e) {
    return <AppLayout><div className="text-muted-foreground p-8">Loading…</div></AppLayout>;
  }

  // For revision_requested, show the step of the gate that was declined
  const currentStep = e.status === "revision_requested"
    ? (e.revision_gate ?? 1)
    : (STATUS_STEP[e.status ?? ""] ?? 1);
  const isDelivered = ["delivered", "approved"].includes(e.status ?? "");
  const isRevisionRequested = e.status === "revision_requested";
  const gateConfig = GATE_CONFIG[e.status ?? ""];
  const isAtGate = !!gateConfig;

  // ── Gate Actions ──────────────────────────────────────────────
  const handleGateApprove = async () => {
    if (!gateConfig) return;
    setGateSubmitting(true);
    try {
      await fetch(gateConfig.approveWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engagement_id: id, client_name: e.client_name, deck_type: e.deck_type, industry: e.industry }),
      });
      setProcessingAfterApproval(true);
      toast.success("Approved — next stage starting…");
      startPolling(e.status ?? "");
    } catch {
      toast.error("Webhook failed — check n8n");
    } finally {
      setGateSubmitting(false);
    }
  };

  const handleGateDecline = async () => {
    if (!declineFeedback.trim()) { toast.error("Please add feedback before declining"); return; }
    if (!gateConfig) return;
    setGateSubmitting(true);
    try {
      await supabase.from("engagements").update({
        status: "revision_requested",
        revision_gate: gateConfig.gate,
        revision_notes: declineFeedback,
      }).eq("id", id);
      await fetch(gateConfig.declineWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id, engagement_id: id,
          client_name: e.client_name, industry: e.industry, deck_type: e.deck_type,
          revision_notes: declineFeedback,
          objectives: e.engagement_goal, timeline: e.timeline,
        }),
      });
      toast.success("Declined — workflow will revise and resubmit");
      startPolling("revision_requested");
      setDeclineOpen(false);
      setDeclineFeedback("");
    } catch {
      toast.error("Failed — check n8n");
    } finally {
      setGateSubmitting(false);
    }
  };

  // ── Revision resubmit ─────────────────────────────────────────
  const resubmit = async () => {
    if (!revisionNotes.trim()) { toast.error("Add revision notes first"); return; }
    setResubmitting(true);
    const gate = e.revision_gate ?? 1;
    // Map gate → webhook and the in-progress status to set while the workflow runs
    const webhookMap: Record<number, string> = {
      1: WEBHOOKS.discovery,
      2: WEBHOOKS.research,
      3: WEBHOOKS.storyline,
      4: WEBHOOKS.qa,
    };
    const inProgressStatus: Record<number, string> = {
      1: "discovery",
      2: "research",
      3: "storyline_review",
      4: "draft_review",
    };
    try {
      const newStatus = inProgressStatus[gate] ?? "discovery";
      await supabase.from("engagements").update({
        revision_notes: revisionNotes,
        status: newStatus,
      }).eq("id", id);
      const url = webhookMap[gate];
      if (url) {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id, engagement_id: id,
            client_name: e.client_name, deck_type: e.deck_type,
            industry: e.industry, revision_notes: revisionNotes,
          }),
        });
      }
      toast.success("Resubmitted — workflow is revising…");
      startPolling(newStatus);
      setRevisionNotes("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to resubmit");
    } finally {
      setResubmitting(false);
    }
  };

  // ── Final deck approve / request changes ──────────────────────
  const approveDeck = async () => {
    await supabase.from("engagements").update({ status: "approved" }).eq("id", id);
    toast.success("Deck approved!");
  };

  const reviseDeck = async () => {
    if (!deckFeedback.trim()) { toast.error("Add feedback first"); return; }
    await supabase.from("engagements").update({ status: "revision_requested", revision_gate: 5, revision_notes: deckFeedback }).eq("id", id);
    try {
      await fetch(WEBHOOKS.delivery, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engagement_id: id, revision_notes: deckFeedback }),
      });
    } catch {}
    toast.success("Revision requested");
    setDeckReviseOpen(false);
    setDeckFeedback("");
  };

  return (
    <AppLayout>
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--navy)]">{e.client_name}</h1>
          <p className="text-muted-foreground text-sm">{e.project_name}</p>
        </div>
        <StatusBadge status={e.status} />
      </div>

      {/* ── Post-Approve Processing Banner ─────────────────────── */}
      {processingAfterApproval && (
        <div className="mb-6 rounded-xl border border-emerald-300 bg-emerald-50 p-5 flex items-center gap-4 animate-pulse">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
          </div>
          <div>
            <p className="font-semibold text-emerald-900">✓ Approved — AI is working on the next stage</p>
            <p className="text-sm text-emerald-700 mt-0.5">This page will update automatically when the next gate is ready. No action needed.</p>
          </div>
        </div>
      )}

      {/* ── Gate Panel ─────────────────────────────────────────── */}
      {isAtGate && !processingAfterApproval && (
        <div className="mb-6 rounded-xl border-2 border-[var(--navy)] bg-[var(--navy)]/5 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--navy)] text-white text-xs font-semibold">
                  {gateConfig.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{gateConfig.description}</p>
            </div>
          </div>

          {!declineOpen ? (
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleGateApprove}
                disabled={gateSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 disabled:opacity-60 transition"
              >
                {gateSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                Approve
              </button>
              <button
                onClick={() => setDeclineOpen(true)}
                disabled={gateSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 font-medium text-sm hover:bg-red-100 disabled:opacity-60 transition"
              >
                <ThumbsDown className="w-4 h-4" />
                Decline with Feedback
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Feedback for the AI <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={declineFeedback}
                onChange={(ev) => setDeclineFeedback(ev.target.value)}
                placeholder="What needs to change? Be specific — the AI will incorporate this and redo the work."
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[var(--navy)]/30"
                autoFocus
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleGateDecline}
                  disabled={gateSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60"
                >
                  {gateSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Send Decline & Retrigger
                </button>
                <button
                  onClick={() => { setDeclineOpen(false); setDeclineFeedback(""); }}
                  className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Revision Requested Panel ───────────────────────────── */}
      {isRevisionRequested && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400 text-white text-sm font-bold">!</div>
            <div>
              <h3 className="font-semibold text-amber-900">Revision Requested — Gate {e.revision_gate ?? 1}</h3>
              <p className="text-sm text-amber-800 mt-0.5">The workflow was sent back. Your feedback has been recorded. Update and resubmit when ready.</p>
              {e.revision_notes && (
                <div className="mt-2 text-sm text-amber-900 bg-amber-100 rounded-lg p-3 border border-amber-200">
                  <span className="font-medium">Previous feedback:</span> {e.revision_notes}
                </div>
              )}
            </div>
          </div>
          <textarea
            rows={4}
            value={revisionNotes}
            onChange={(ev) => setRevisionNotes(ev.target.value)}
            placeholder="Additional notes for the revision…"
            className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--navy)]/30"
          />
          <div className="flex justify-end mt-3">
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
      )}

      {/* ── Progress + Content ─────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-6">
        {/* Stepper */}
        <div className="col-span-2 bg-card border border-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Progress</h2>
          <ol className="space-y-5">
            {STEPS.map((s, i) => {
              const done = currentStep > s.key || isDelivered;
              const active = currentStep === s.key && !isDelivered;
              const isGateStep = isAtGate && s.key === currentStep;
              return (
                <li key={s.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
                      done ? "bg-[var(--navy)] text-white"
                      : isGateStep ? "bg-emerald-100 border-2 border-emerald-500 text-emerald-600"
                      : active ? "bg-[var(--orange)] text-white"
                      : "bg-secondary text-muted-foreground"
                    }`}>
                      {done ? <Check className="w-4 h-4" />
                       : isGateStep ? <Check className="w-4 h-4 text-emerald-600" />
                       : active ? <Loader2 className="w-4 h-4 animate-spin" />
                       : <Circle className="w-4 h-4" />}
                    </div>
                    {i < STEPS.length - 1 && <div className={`w-px flex-1 mt-1 ${done ? "bg-[var(--navy)]" : "bg-border"}`} style={{ minHeight: 24 }} />}
                  </div>
                  <div className="pb-3">
                    <div className={`font-medium ${isGateStep ? "text-emerald-700" : active ? "text-[var(--orange)]" : done ? "text-foreground" : "text-muted-foreground"}`}>
                      {s.name}
                      {isGateStep && <span className="ml-2 text-xs font-normal text-emerald-600">⬤ Gate pending</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Output tabs */}
        <div className="col-span-3 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
          <div className="flex border-b border-border overflow-x-auto">
            {[
              { k: "brief",     label: "Brief" },
              { k: "research",  label: "Research" },
              { k: "storyline", label: "Storyline" },
              { k: "qa",        label: "QA" },
              { k: "deck",      label: "Deck" },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setTab(t.k as any)}
                className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition ${
                  tab === t.k ? "border-[var(--orange)] text-[var(--navy)]" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6 flex-1 overflow-auto">
            {tab === "brief" && (
              <SmartContent data={e.requirements_json} placeholder="Requirements brief will appear here once Discovery completes." />
            )}
            {tab === "research" && (
              <SmartContent data={e.research_brief} placeholder="Research will appear here once Stage 2 completes." />
            )}
            {tab === "storyline" && (
              <StorylineContent data={e.storyline_json} />
            )}
            {tab === "qa" && (
              <SmartContent data={e.quality_report} placeholder="QA feedback will appear here once Stage 4 completes." />
            )}
            {tab === "deck" && (
              e.output_slides_url ? (
                <div>
                  <div className="aspect-video w-full rounded-lg overflow-hidden border border-border mb-4 bg-black">
                    <iframe src={e.output_slides_url.replace('/edit', '/embed')} className="w-full h-full" allowFullScreen />
                  </div>
                  <div className="flex gap-3 items-center mb-3">
                    <a
                      href={e.output_slides_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open in Google Slides
                    </a>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={approveDeck}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700"
                    >
                      <ThumbsUp className="w-4 h-4" /> Approve Deck
                    </button>
                    <button
                      onClick={() => setDeckReviseOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--orange)] text-white font-medium text-sm hover:opacity-90"
                    >
                      <ThumbsDown className="w-4 h-4" /> Request Changes
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

      {/* ── Deck revise modal ─────────────────────────────────── */}
      {deckReviseOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setDeckReviseOpen(false)}>
          <div className="bg-card rounded-xl p-6 w-full max-w-lg" onClick={(ev) => ev.stopPropagation()}>
            <h3 className="font-semibold text-lg mb-3">Request changes to deck</h3>
            <textarea
              rows={5}
              value={deckFeedback}
              onChange={(ev) => setDeckFeedback(ev.target.value)}
              placeholder="Describe what you'd like changed"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[var(--navy)]/30"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setDeckReviseOpen(false)} className="px-4 py-2 rounded-lg border border-border text-sm">Cancel</button>
              <button onClick={reviseDeck} className="px-4 py-2 rounded-lg bg-[var(--orange)] text-white text-sm font-medium">Submit</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

// ── Storyline accordion renderer ──────────────────────────────────
function StorylineContent({ data }: { data: any }) {
  const [openIdx, setOpenIdx] = useState<number>(0);

  if (data == null) {
    return <div className="text-muted-foreground text-sm italic py-6 text-center">Storyline will appear here once Stage 3 completes.</div>;
  }

  // Try to extract a slides array from various shapes
  let slides: any[] = [];
  if (Array.isArray(data)) {
    slides = data;
  } else if (Array.isArray(data?.slides)) {
    slides = data.slides;
  } else if (typeof data === "object" && data !== null) {
    // Check for numbered keys like { "1": {...}, "2": {...} } or "slide_1" etc.
    const numbered = Object.entries(data).filter(([k]) => /^(slide[_\s]?)?\d+$/i.test(k));
    if (numbered.length > 1) {
      slides = numbered.sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([, v]) => v);
    }
  }

  if (slides.length === 0) {
    // Fall back to plain rendering
    return <SmartContent data={data} placeholder="Storyline will appear here once Stage 3 completes." />;
  }

  return (
    <div className="space-y-2">
      {slides.map((slide, idx) => {
        const isOpen = openIdx === idx;
        const slideNum = (slide?.slide_number ?? slide?.slide ?? idx + 1);
        const title = slide?.title ?? slide?.slide_title ?? slide?.heading ?? `Slide ${slideNum}`;
        const content = slide?.content ?? slide?.key_message ?? slide?.talking_points ?? slide?.notes ?? slide?.body ?? slide;
        return (
          <div key={idx} className="rounded-lg border border-border overflow-hidden">
            <button
              className={`w-full flex items-center justify-between px-4 py-3 text-left transition ${
                isOpen ? "bg-[var(--navy)] text-white" : "bg-secondary/40 hover:bg-secondary/70 text-foreground"
              }`}
              onClick={() => setOpenIdx(isOpen ? -1 : idx)}
            >
              <span className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isOpen ? "bg-white/20 text-white" : "bg-[var(--navy)]/10 text-[var(--navy)]"}`}>
                  Slide {slideNum}
                </span>
                <span className="font-medium text-sm">{String(title)}</span>
              </span>
              <span className={`text-lg leading-none transition-transform ${isOpen ? "rotate-180" : ""}`}>⌄</span>
            </button>
            {isOpen && (
              <div className="px-4 py-4 bg-card border-t border-border">
                {typeof content === "string" ? (
                  <RichText text={content} />
                ) : typeof content === "object" && content !== null ? (
                  <StructuredView data={content} />
                ) : (
                  <p className="text-sm text-foreground">{String(content)}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Smart content renderer ────────────────────────────────────────
function SmartContent({ data, placeholder }: { data: any; placeholder: string }) {
  if (data == null) return <div className="text-muted-foreground text-sm italic py-6 text-center">{placeholder}</div>;
  if (typeof data === "string") return <RichText text={data} />;
  const textField = data.markdown ?? data.text ?? data.summary ?? data.content ?? data.output ?? data.result;
  if (typeof textField === "string") return <RichText text={textField} />;
  return <StructuredView data={data} />;
}

function inlineMd(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((p, i) => {
        if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i} className="font-semibold text-foreground">{p.slice(2, -2)}</strong>;
        if (/^\*[^*]+\*$/.test(p)) return <em key={i}>{p.slice(1, -1)}</em>;
        if (/^`[^`]+`$/.test(p)) return <code key={i} className="bg-secondary px-1 py-0.5 rounded text-xs font-mono">{p.slice(1, -1)}</code>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {lines.map((l, i) => {
        if (!l.trim()) return <div key={i} className="h-2" />;
        if (/^###\s/.test(l)) return <h4 key={i} className="text-sm font-semibold text-[var(--navy)] mt-4 mb-0.5">{inlineMd(l.replace(/^###\s/, ""))}</h4>;
        if (/^##\s/.test(l))  return <h3 key={i} className="text-base font-bold text-[var(--navy)] mt-5 mb-1 border-b border-border pb-1">{inlineMd(l.replace(/^##\s/, ""))}</h3>;
        if (/^#\s/.test(l))   return <h2 key={i} className="text-lg font-bold text-[var(--navy)] mt-5 mb-1">{inlineMd(l.replace(/^#\s/, ""))}</h2>;
        if (/^[-*•]\s/.test(l)) return (
          <div key={i} className="flex gap-2 ml-1">
            <span className="text-[var(--orange)] flex-shrink-0 mt-0.5 text-base leading-none">•</span>
            <span className="text-foreground">{inlineMd(l.replace(/^[-*•]\s/, ""))}</span>
          </div>
        );
        if (/^\d+\.\s/.test(l)) {
          const num = l.match(/^\d+/)?.[0];
          return (
            <div key={i} className="flex gap-2 ml-1">
              <span className="text-[var(--navy)] font-semibold text-xs flex-shrink-0 w-5 text-right mt-0.5">{num}.</span>
              <span className="text-foreground">{inlineMd(l.replace(/^\d+\.\s/, ""))}</span>
            </div>
          );
        }
        return <p key={i} className="text-foreground">{inlineMd(l)}</p>;
      })}
    </div>
  );
}

function StructuredView({ data }: { data: Record<string, any> }) {
  const skip = new Set(["id", "engagement_id", "created_at", "updated_at"]);
  const entries = Object.entries(data).filter(([k, v]) => !skip.has(k) && v != null && v !== "");
  if (entries.length === 0) return <div className="text-muted-foreground text-sm italic">No content yet.</div>;
  return (
    <div className="space-y-3">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-lg border border-border bg-secondary/30 overflow-hidden">
          <div className="px-4 py-2 border-b border-border bg-secondary/60">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {key.replace(/_/g, " ")}
            </span>
          </div>
          <div className="px-4 py-3">
            <StructuredValue value={value} />
          </div>
        </div>
      ))}
    </div>
  );
}

function StructuredValue({ value }: { value: any }) {
  if (value == null) return <span className="text-muted-foreground text-sm italic">—</span>;
  if (typeof value === "string") return <RichText text={value} />;
  if (typeof value === "number" || typeof value === "boolean")
    return <span className="text-sm font-medium text-foreground">{String(value)}</span>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground text-sm italic">—</span>;
    return (
      <ul className="space-y-1.5">
        {value.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className="text-[var(--orange)] flex-shrink-0 mt-0.5">•</span>
            {typeof item === "string" ? <span>{item}</span>
              : typeof item === "object" && item !== null ? <StructuredView data={item} />
              : <span>{String(item)}</span>}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") return <StructuredView data={value} />;
  return <span className="text-sm">{String(value)}</span>;
}
