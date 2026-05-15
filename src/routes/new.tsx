import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, DECK_TYPES } from "@/components/AppLayout";
import { toast } from "sonner";
import { Check, ChevronRight, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/new")({ component: NewEngagement });

const STEPS = ["Client Info", "Deck Type", "Project Details", "Review & Launch"];

const INDUSTRIES = ["Technology", "Financial Services", "Healthcare", "Retail", "Manufacturing", "Other"];
const SIZES = ["Startup <50", "SMB 50-500", "Mid-Market 500-5000", "Enterprise 5000+"];
const BUDGETS = ["<$50K", "$50-200K", "$200K-1M", "$1M+"];

const DECK_DETAILS = {
  strategy: {
    accent: "border-blue-500 bg-blue-50",
    title: "Strategy / Go-To-Market",
    desc: "Market entry, growth strategy, competitive positioning, GTM planning",
    slides: ["Executive Summary", "Market Analysis", "Competitive Landscape", "Strategic Options", "Opportunity Sizing", "Financial Impact", "Recommendations"],
  },
  due_diligence: {
    accent: "border-purple-500 bg-purple-50",
    title: "Due Diligence / M&A",
    desc: "Investment thesis, target assessment, risk analysis, deal structuring",
    slides: ["Investment Thesis", "Market Position", "Revenue Analysis", "Risk Assessment", "Valuation", "Deal Recommendations"],
  },
  fundraising: {
    accent: "border-green-500 bg-green-50",
    title: "Fundraising / Investor",
    desc: "Pitch decks, investor narrative, market opportunity, financial projections",
    slides: ["The Problem", "Our Solution", "Market Opportunity", "Business Model", "Traction", "Financial Projections", "The Ask"],
  },
  operational: {
    accent: "border-orange-500 bg-orange-50",
    title: "Operational / Transformation",
    desc: "Process improvement, digital transformation, org design, change management",
    slides: ["Current State Assessment", "Gap Analysis", "Target Operating Model", "Initiative Prioritization", "Roadmap", "Business Case"],
  },
} as const;

type DeckKey = keyof typeof DECK_DETAILS;

function NewEngagement() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    client_name: "",
    industry: "",
    company_size: "",
    contact_name: "",
    contact_email: "",
    deck_type: "" as DeckKey | "",
    project_name: "",
    challenge: "",
    objectives: "",
    timeline: "",
    budget: "",
    additional_context: "",
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!form.client_name) e.client_name = "Required";
      if (!form.industry) e.industry = "Required";
      if (!form.company_size) e.company_size = "Required";
      if (!form.contact_name) e.contact_name = "Required";
      if (!form.contact_email) e.contact_email = "Required";
      else if (!/^\S+@\S+\.\S+$/.test(form.contact_email)) e.contact_email = "Invalid email";
    }
    if (step === 1 && !form.deck_type) e.deck_type = "Pick a deck type";
    if (step === 2) {
      if (!form.project_name) e.project_name = "Required";
      if (!form.challenge) e.challenge = "Required";
      if (!form.objectives) e.objectives = "Required";
      if (!form.timeline) e.timeline = "Required";
      if (!form.budget) e.budget = "Required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const launch = async () => {
    if (!validate()) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("engagements")
      .insert({ ...form, status: "discovery", current_step: 1 })
      .select("id")
      .single();
    if (error || !data) {
      toast.error("Failed to create engagement");
      setSubmitting(false);
      return;
    }
    try {
      await fetch("https://rochak01.app.n8n.cloud/webhook/consultflow-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: data.id, ...form }),
      });
    } catch {
      // non-blocking
    }
    toast.success("Engagement launched");
    navigate({ to: "/engagement/$id", params: { id: data.id } });
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-[var(--navy)] mb-6">New Engagement</h1>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                i < step ? "bg-[var(--navy)] text-white" : i === step ? "bg-[var(--orange)] text-white" : "bg-secondary text-muted-foreground"
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-sm ${i === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{label}</span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl p-8">
          {step === 0 && <Step1 form={form} set={set} errors={errors} />}
          {step === 1 && <Step2 form={form} set={set} errors={errors} />}
          {step === 2 && <Step3 form={form} set={set} errors={errors} />}
          {step === 3 && <Step4 form={form} />}
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={prev}
            disabled={step === 0}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-border text-sm font-medium disabled:opacity-40 hover:bg-secondary"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={next} className="inline-flex items-center gap-1 px-5 py-2 rounded-lg bg-[var(--navy)] text-white text-sm font-medium hover:opacity-90">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={launch}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--orange)] text-white font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? "Launching…" : "Launch Analysis →"}
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

type SetFn = <K extends string>(k: any, v: any) => void;

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-foreground mb-1.5">{label}</span>
      {children}
      {error && <span className="text-xs text-destructive mt-1 block">{error}</span>}
    </label>
  );
}

const inputCls = "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[var(--navy)]/30 focus:border-[var(--navy)]";

function Step1({ form, set, errors }: any) {
  return (
    <div className="grid grid-cols-2 gap-5">
      <Field label="Client Name" error={errors.client_name}>
        <input className={inputCls} value={form.client_name} onChange={(e) => set("client_name", e.target.value)} />
      </Field>
      <Field label="Industry" error={errors.industry}>
        <select className={inputCls} value={form.industry} onChange={(e) => set("industry", e.target.value)}>
          <option value="">Select…</option>
          {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
        </select>
      </Field>
      <Field label="Company Size" error={errors.company_size}>
        <select className={inputCls} value={form.company_size} onChange={(e) => set("company_size", e.target.value)}>
          <option value="">Select…</option>
          {SIZES.map((i) => <option key={i}>{i}</option>)}
        </select>
      </Field>
      <Field label="Primary Contact Name" error={errors.contact_name}>
        <input className={inputCls} value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} />
      </Field>
      <Field label="Primary Contact Email" error={errors.contact_email}>
        <input type="email" className={inputCls} value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} />
      </Field>
    </div>
  );
}

function Step2({ form, set, errors }: any) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        {(Object.keys(DECK_DETAILS) as DeckKey[]).map((key) => {
          const d = DECK_DETAILS[key];
          const selected = form.deck_type === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => set("deck_type", key)}
              className={`text-left p-5 rounded-xl border-2 transition relative ${
                selected ? "border-[var(--navy)] bg-secondary" : "border-border hover:border-[var(--navy)]/40"
              }`}
            >
              {selected && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[var(--orange)] text-white flex items-center justify-center">
                  <Check className="w-4 h-4" />
                </div>
              )}
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-3 text-2xl border-l-4 ${d.accent}`}>
                {DECK_TYPES[key].icon}
              </div>
              <h3 className="font-semibold text-foreground">{d.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-3">{d.desc}</p>
              <div className="text-xs text-muted-foreground">
                <div className="font-semibold mb-1">Sample slides:</div>
                <div>{d.slides.join(" · ")}</div>
              </div>
            </button>
          );
        })}
      </div>
      {errors.deck_type && <span className="text-xs text-destructive mt-3 block">{errors.deck_type}</span>}
    </div>
  );
}

function Step3({ form, set, errors }: any) {
  return (
    <div className="grid grid-cols-2 gap-5">
      <Field label="Project Name" error={errors.project_name}>
        <input className={inputCls} value={form.project_name} onChange={(e) => set("project_name", e.target.value)} />
      </Field>
      <Field label="Timeline / Deadline" error={errors.timeline}>
        <input className={inputCls} placeholder="e.g. 2 weeks" value={form.timeline} onChange={(e) => set("timeline", e.target.value)} />
      </Field>
      <div className="col-span-2">
        <Field label="Business Challenge" error={errors.challenge}>
          <textarea rows={3} className={inputCls} value={form.challenge} onChange={(e) => set("challenge", e.target.value)} />
        </Field>
      </div>
      <div className="col-span-2">
        <Field label="Strategic Objectives" error={errors.objectives}>
          <textarea rows={3} className={inputCls} value={form.objectives} onChange={(e) => set("objectives", e.target.value)} />
        </Field>
      </div>
      <Field label="Budget Range" error={errors.budget}>
        <select className={inputCls} value={form.budget} onChange={(e) => set("budget", e.target.value)}>
          <option value="">Select…</option>
          {BUDGETS.map((b) => <option key={b}>{b}</option>)}
        </select>
      </Field>
      <div className="col-span-2">
        <Field label="Additional Context (optional)">
          <textarea rows={3} className={inputCls} value={form.additional_context} onChange={(e) => set("additional_context", e.target.value)} />
        </Field>
      </div>
    </div>
  );
}

function Step4({ form }: any) {
  const entries: [string, string][] = [
    ["Client", form.client_name], ["Industry", form.industry], ["Company Size", form.company_size],
    ["Contact", `${form.contact_name} <${form.contact_email}>`],
    ["Deck Type", DECK_DETAILS[form.deck_type as DeckKey]?.title ?? "—"],
    ["Project Name", form.project_name], ["Timeline", form.timeline], ["Budget", form.budget],
    ["Challenge", form.challenge], ["Objectives", form.objectives],
    ["Additional Context", form.additional_context || "—"],
  ];
  return (
    <div>
      <h3 className="font-semibold text-foreground mb-4">Review your engagement</h3>
      <dl className="divide-y divide-border">
        {entries.map(([k, v]) => (
          <div key={k} className="grid grid-cols-3 py-3 gap-4">
            <dt className="text-sm font-medium text-muted-foreground">{k}</dt>
            <dd className="col-span-2 text-sm text-foreground whitespace-pre-wrap">{v || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
