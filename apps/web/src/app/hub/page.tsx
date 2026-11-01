"use client";

import { useState, useEffect } from "react";
import { formatMoneyCompact, fromMajor, money } from "@/lib/core/money";
import type { BudgetPlan, EventBrief, TimelineTask, Conflict } from "@/lib/core/types";

// Demo brief — hardcoded for the hackathon demo. In production this comes from
// the event store via the user's session.
const DEMO_BRIEF: EventBrief = {
  eventFamily: "wedding",
  eventSubtype: "Punjabi wedding",
  eventDate: "2027-02-14",
  dateConfidence: "fixed",
  city: "Jaipur",
  cityTier: "tier1",
  guestCount: 350,
  budget: { amountMinor: 2500000_00, currency: "INR" },
  budgetFlexibility: "soft",
  communities: ["punjabi"],
  ritualsOptIn: ["mehndi", "haldi", "sangeet", "baraat", "pheras", "reception"],
  dietary: ["jain", "satvik"],
  accessibility: [],
  formality: "traditional",
  aestheticTags: ["royal", "marigold", "jewel-tones"],
  mustHaves: ["live dhol", "fireworks"],
  hardConstraints: [],
  localePack: "in-IN",
  openQuestions: [],
};

export default function HubPage() {
  const [budget, setBudget] = useState<BudgetPlan | null>(null);
  const [tasks, setTasks] = useState<TimelineTask[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [guardrailLog, setGuardrailLog] = useState<unknown[]>([]);

  useEffect(() => {
    async function loadPlan() {
      const { allocateBudget } = await import("@/lib/core/budget");
      const { generateTimeline } = await import("@/lib/core/timeline");
      const { detectConflicts } = await import("@/lib/core/conflicts");
      const b = allocateBudget(DEMO_BRIEF);
      const t = generateTimeline(DEMO_BRIEF);
      const c = detectConflicts(DEMO_BRIEF, b, t);
      setBudget(b);
      setTasks(t);
      setConflicts(c);
    }
    loadPlan();
  }, []);

  const daysToGo = Math.max(
    0,
    Math.ceil(
      (new Date(DEMO_BRIEF.eventDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
  );

  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const readiness = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const urgentTasks = tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 3);

  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    const newMessages = [...chatMessages, { role: "user" as const, content: userMsg }];
    setChatMessages(newMessages);
    setChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, brief: DEMO_BRIEF }),
      });
      const data = await res.json();

      if (data.guardrailEvents) {
        setGuardrailLog((prev) => [...(prev as unknown[]), ...data.guardrailEvents]);
      }

      setChatMessages([
        ...newMessages,
        { role: "assistant", content: data.response || data.error || "Something went wrong." },
      ]);
    } catch {
      setChatMessages([
        ...newMessages,
        { role: "assistant", content: "Could not reach the server. Please check your connection." },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <main className="pt-20 px-margin max-w-md mx-auto flex flex-col gap-space-lg pb-36">
      {/* Hero Celebration Card */}
      <section className="relative overflow-hidden rounded-2xl bg-surface-container-lowest luxury-card gold-foil-top p-5 ambient-glow">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm font-label-sm bg-accent-container text-on-accent-container border border-secondary/20">
              <span className="material-symbols-outlined text-[13px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
              Jaipur Royal Celebration
            </span>
            <h2 className="mt-2.5 font-display text-display-hero-mobile text-primary tracking-tight leading-tight">
              {daysToGo}{" "}
              <span className="font-headline-sm text-headline-sm font-normal text-on-surface-variant italic">
                Days to Go
              </span>
            </h2>
          </div>
          {/* Readiness Ring */}
          <div className="relative flex flex-col items-center justify-center w-20 h-20 bg-surface-container-low/60 rounded-full border border-secondary/20 shadow-inner">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-surface-variant"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="text-secondary stroke-current"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                strokeDasharray={`${readiness}, 100`}
                strokeLinecap="round"
                strokeWidth="3"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-headline-sm text-[15px] font-semibold text-primary leading-none">
                {readiness}%
              </span>
              <span className="font-label-sm text-[9px] uppercase tracking-wider text-on-surface-variant">
                Planned
              </span>
            </div>
          </div>
        </div>

        {/* AI Insight Banner */}
        <div className="rounded-xl p-3.5 bg-surface-container-low/90 border border-outline-variant/30 flex items-start gap-2.5">
          <span
            className="material-symbols-outlined text-secondary shrink-0 mt-0.5"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            auto_awesome
          </span>
          <div className="space-y-1">
            <p className="font-body-md text-body-md text-primary font-medium leading-snug">
              {conflicts.length > 0 ? (
                <>
                  <span className="text-error font-semibold">{conflicts.length} issue{conflicts.length > 1 ? "s" : ""} detected.</span>{" "}
                  {conflicts[0].message}
                </>
              ) : budget ? (
                <>
                  Budget ready at{" "}
                  <span className="text-success font-semibold">
                    {formatMoneyCompact(budget.perHead)} per guest
                  </span>
                  . {budget.lines.length} categories allocated with {(budget.contingencyPct * 100).toFixed(0)}% contingency.
                </>
              ) : (
                "Loading your plan..."
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Key Metrics Bento */}
      <section className="grid grid-cols-3 gap-2.5">
        <MetricTile
          label="Budget"
          value={budget ? formatMoneyCompact(budget.total) : "..."}
          subLabel={`${DEMO_BRIEF.guestCount} guests`}
          icon="payments"
          progress={budget ? 0.63 : 0}
          color="text-secondary"
        />
        <MetricTile
          label="Guests"
          value={String(DEMO_BRIEF.guestCount)}
          subLabel="RSVP pending"
          icon="group"
          progress={0}
          color="text-success"
        />
        <MetricTile
          label="Tasks"
          value={`${completedTasks}/${tasks.length}`}
          subLabel={`${urgentTasks.length} urgent`}
          icon="checklist"
          progress={tasks.length > 0 ? completedTasks / tasks.length : 0}
          color="text-primary"
        />
      </section>

      {/* AI Concierge Actions */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className="material-symbols-outlined text-secondary text-[18px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              magic_button
            </span>
            <h3 className="font-headline-sm text-[17px] text-primary font-semibold">
              AI Concierge
            </h3>
          </div>
          <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">
            Ask Anything
          </span>
        </div>
        <div className="flex overflow-x-auto pb-1 gap-2 custom-scroll -mx-margin px-margin">
          {[
            { label: "Plan my full wedding", icon: "auto_awesome" },
            { label: "Show budget breakdown", icon: "payments" },
            { label: "Suggest sangeet themes", icon: "music_note" },
            { label: "Draft vendor message", icon: "mail" },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => {
                setChatOpen(true);
                setChatInput(action.label);
              }}
              className="shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-surface-container-lowest border border-secondary/30 hover:bg-accent-container active:scale-95 transition-all text-left shadow-sm"
            >
              <span className="w-6 h-6 rounded-full bg-secondary-fixed/40 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[14px]">{action.icon}</span>
              </span>
              <span className="font-label-md text-label-md text-primary font-medium whitespace-nowrap">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Budget Breakdown */}
      {budget && (
        <section className="space-y-3">
          <h3 className="font-headline-sm text-headline-sm text-primary font-semibold">
            Budget Allocation
          </h3>
          <div className="space-y-2">
            {budget.lines.map((line) => (
              <div
                key={line.category}
                className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/20 shadow-sm group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-title-md text-body-md font-semibold text-primary">
                    {line.label}
                  </span>
                  <span className="font-title-md text-title-md text-primary">
                    {formatMoneyCompact(line.allocated)}
                  </span>
                </div>
                <div className="w-full bg-surface-container h-1 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-secondary h-full rounded-full transition-all"
                    style={{
                      width: `${(line.allocated.amountMinor / budget.total.amountMinor) * 100}%`,
                    }}
                  />
                </div>
                {/* Show the math — popover simplified to inline for hackathon */}
                <p className="mt-1.5 text-label-sm text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                  {line.rationale}
                  {line.sourceCitation && (
                    <span className="block text-outline mt-0.5 text-[10px]">
                      Source: {line.sourceCitation}
                    </span>
                  )}
                </p>
              </div>
            ))}
            {/* Contingency */}
            <div className="bg-accent-container rounded-xl p-3 border border-secondary/20">
              <div className="flex items-center justify-between">
                <span className="font-title-md text-body-md font-semibold text-on-accent-container">
                  Contingency ({(budget.contingencyPct * 100).toFixed(0)}%)
                </span>
                <span className="font-title-md text-title-md text-on-accent-container">
                  {formatMoneyCompact(budget.contingency)}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Active Focus — Upcoming Tasks */}
      {urgentTasks.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-headline-sm text-headline-sm text-primary font-semibold">
                Active Focus
              </h3>
              <p className="font-body-md text-label-sm text-on-surface-variant">
                Top priority tasks coming up
              </p>
            </div>
            <button className="text-label-md font-label-md text-secondary font-semibold hover:underline">
              View All ({tasks.length})
            </button>
          </div>
          <div className="space-y-2.5">
            {urgentTasks.map((task) => {
              const daysUntil = Math.ceil(
                (new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              );
              const isUrgent = daysUntil <= 14;

              return (
                <div
                  key={task.id}
                  className="group bg-surface-container-lowest rounded-xl p-3.5 border border-outline-variant/20 hover:border-secondary/40 transition-all flex items-start gap-3 shadow-sm"
                >
                  <label className="relative flex items-center justify-center mt-0.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded-full border-secondary text-success focus:ring-0 cursor-pointer"
                      checked={task.status === "done"}
                      readOnly
                    />
                  </label>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-title-md text-body-lg font-semibold text-primary group-hover:text-secondary transition-colors truncate">
                        {task.title}
                      </h4>
                      <span
                        className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-label-sm border ${
                          task.priority === "high"
                            ? "bg-success-container text-on-success-container border-success/20"
                            : "bg-surface-container text-on-surface-variant border-outline-variant/20"
                        }`}
                      >
                        {task.priority === "high" ? "High" : "Medium"}
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant mt-0.5 line-clamp-1">
                      {task.whyItMatters}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-label-sm font-label-sm text-on-surface-variant">
                      <span
                        className={`flex items-center gap-1 ${isUrgent ? "text-error font-medium" : ""}`}
                      >
                        <span className="material-symbols-outlined text-[14px]">event</span>
                        {isUrgent ? `Due in ${daysUntil}d` : task.dueDate}
                      </span>
                      <span className="text-outline-variant">&bull;</span>
                      <span className="flex items-center gap-1 text-secondary">
                        <span className="material-symbols-outlined text-[14px]">
                          arrow_back_ios_new
                        </span>
                        AI Prompt Ready
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Conflicts Warning */}
      {conflicts.length > 0 && (
        <section className="bg-error-container rounded-xl p-4 border border-error/20">
          <h3 className="font-title-md text-title-md text-on-error-container font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">warning</span>
            Plan Conflicts ({conflicts.length})
          </h3>
          <ul className="mt-2 space-y-1.5">
            {conflicts.map((c, i) => (
              <li key={i} className="text-body-md text-on-error-container flex items-start gap-2">
                <span className={`shrink-0 mt-1 w-2 h-2 rounded-full ${c.severity === "blocker" ? "bg-error" : "bg-on-accent-container"}`} />
                {c.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Guardrail Log — visible for demo / judges */}
      {guardrailLog.length > 0 && (
        <section className="bg-surface-container rounded-xl p-4 border border-outline-variant/30">
          <h3 className="font-title-md text-title-md text-primary font-semibold flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[18px]">shield</span>
            Guardrail Log
          </h3>
          <div className="space-y-1 max-h-40 overflow-y-auto text-label-sm text-on-surface-variant font-mono">
            {(guardrailLog as Array<{ ruleId: string; verdict: string; detail?: string }>).map((ev, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    ev.verdict === "pass"
                      ? "bg-success"
                      : ev.verdict === "flag"
                      ? "bg-secondary"
                      : "bg-error"
                  }`}
                />
                <span>
                  {ev.ruleId}: {ev.verdict}
                  {ev.detail ? ` — ${ev.detail}` : ""}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Chat Drawer */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-surface">
          {/* Chat Header */}
          <div className="flex items-center justify-between px-margin py-3 border-b border-outline-variant/30 bg-surface">
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-secondary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_awesome
              </span>
              <span className="font-headline-sm text-headline-sm text-primary font-semibold">
                AI Concierge
              </span>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-margin py-4 space-y-4">
            {chatMessages.length === 0 && (
              <div className="text-center py-12 text-on-surface-variant">
                <span
                  className="material-symbols-outlined text-[48px] text-secondary/40 block mb-3"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  auto_awesome
                </span>
                <p className="font-headline-sm text-headline-sm text-primary mb-1">
                  How can I help?
                </p>
                <p className="font-body-md text-body-md">
                  Ask me anything about your celebration planning.
                </p>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-primary-container text-on-primary-container"
                      : "champagne-pill"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <span
                      className="material-symbols-outlined text-secondary text-[14px] mb-1 block"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      auto_awesome
                    </span>
                  )}
                  <p className="font-body-md text-body-md whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="champagne-pill rounded-2xl px-4 py-3">
                  <span className="material-symbols-outlined text-secondary animate-pulse text-[14px]">
                    auto_awesome
                  </span>
                  <span className="text-body-md text-on-surface-variant ml-2">Thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-margin py-3 border-t border-outline-variant/30 bg-surface">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                placeholder="Describe your celebration..."
                className="flex-1 px-4 py-3 rounded-full bg-surface-container-low border border-outline-variant/30 text-body-md focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary"
              />
              <button
                onClick={sendChat}
                disabled={!chatInput.trim() || chatLoading}
                className="w-11 h-11 rounded-full bg-primary-container text-surface flex items-center justify-center shadow hover:scale-95 transition-transform disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// --- Sub-components inlined to keep the file count low for the hackathon ---

function MetricTile({
  label,
  value,
  subLabel,
  icon,
  progress,
  color,
}: {
  label: string;
  value: string;
  subLabel: string;
  icon: string;
  progress: number;
  color: string;
}) {
  return (
    <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between text-on-surface-variant">
        <span className="font-label-sm text-label-sm uppercase tracking-wide">{label}</span>
        <span className={`material-symbols-outlined text-[15px] ${color}`}>{icon}</span>
      </div>
      <div className="mt-2">
        <div className="font-title-md text-title-md text-primary leading-tight">{value}</div>
        <div className="font-label-sm text-[11px] text-on-surface-variant">{subLabel}</div>
      </div>
      {progress > 0 && (
        <div className="w-full bg-surface-container h-1 rounded-full mt-2.5 overflow-hidden">
          <div
            className="bg-secondary h-full rounded-full"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
