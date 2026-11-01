"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Icon from "@/components/ui/Icon";
import MetricTile from "@/components/ui/MetricTile";
import ProgressBar from "@/components/ui/ProgressBar";
import PromptPillRow from "@/components/ui/PromptPill";
import ReadinessRing from "@/components/ui/ReadinessRing";
import { formatMoneyCompact } from "@/lib/core/money";
import type { BudgetPlan, Conflict, TimelineTask } from "@/lib/core/types";
import { DEMO_BRIEF } from "@/lib/demo-brief";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** The guardrail chain refused this exchange; it is kept on screen but never re-sent. */
  blocked?: boolean;
  /** The request failed; kept on screen but never re-sent. */
  isError?: boolean;
}

interface GuardrailLogEntry {
  ruleId: string;
  verdict: string;
  detail?: string;
}

interface ChatApiResponse {
  response?: string;
  error?: string;
  blocked?: boolean;
  guardrailEvents?: GuardrailLogEntry[];
}

const DAY_MS = 1000 * 60 * 60 * 24;
const FOCUS_TASK_COUNT = 3;
const URGENT_WITHIN_DAYS = 14;

const CONCIERGE_PROMPTS = [
  { label: "Plan my full wedding", icon: "auto_awesome" },
  { label: "Show budget breakdown", icon: "payments" },
  { label: "Suggest sangeet themes", icon: "music_note" },
  { label: "Draft vendor message", icon: "mail" },
] as const;

/**
 * Only clean exchanges go back to the model. Blocked or failed turns would otherwise
 * re-trigger the input guardrail on every later message and break turn alternation.
 */
function toApiHistory(messages: ChatMessage[]): Array<Pick<ChatMessage, "role" | "content">> {
  return messages
    .filter((m) => !m.blocked && !m.isError)
    .map(({ role, content }) => ({ role, content }));
}

function daysBetween(fromMs: number, isoDate: string): number {
  return Math.ceil((new Date(isoDate).getTime() - fromMs) / DAY_MS);
}

export default function HubPage() {
  const [budget, setBudget] = useState<BudgetPlan | null>(null);
  const [tasks, setTasks] = useState<TimelineTask[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [showAllTasks, setShowAllTasks] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatAlert, setChatAlert] = useState("");
  const [guardrailLog, setGuardrailLog] = useState<GuardrailLogEntry[]>([]);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatTriggerRef = useRef<HTMLElement | null>(null);

  const dialogTitleId = useId();
  const chatInputId = useId();
  const taskListId = useId();

  useEffect(() => {
    async function loadPlan() {
      const [{ allocateBudget }, { generateTimeline }, { detectConflicts }] = await Promise.all([
        import("@/lib/core/budget"),
        import("@/lib/core/timeline"),
        import("@/lib/core/conflicts"),
      ]);
      const b = allocateBudget(DEMO_BRIEF);
      const t = generateTimeline(DEMO_BRIEF);
      setBudget(b);
      setTasks(t);
      setConflicts(detectConflicts(DEMO_BRIEF, b, t));
    }
    // Time-dependent values are computed after mount so server and client HTML match.
    setNowMs(Date.now());
    void loadPlan();
  }, []);

  // Native modal <dialog>: the browser makes the rest of the page inert, keeps focus
  // inside, and fires `close` on Escape.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (chatOpen && !dialog.open) {
      dialog.showModal();
      chatInputRef.current?.focus();
    } else if (!chatOpen && dialog.open) {
      dialog.close();
    }
  }, [chatOpen]);

  const daysToGo = nowMs === null ? null : Math.max(0, daysBetween(nowMs, DEMO_BRIEF.eventDate));
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const readiness = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const sortedTasks = [...tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const focusTasks = showAllTasks ? sortedTasks : sortedTasks.slice(0, FOCUS_TASK_COUNT);
  const urgentCount =
    nowMs === null
      ? 0
      : tasks.filter((t) => t.status !== "done" && daysBetween(nowMs, t.dueDate) <= URGENT_WITHIN_DAYS).length;

  function toggleTask(id: string) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: t.status === "done" ? "todo" : "done" } : t))
    );
  }

  function openChat(prefill: string, trigger: HTMLElement) {
    chatTriggerRef.current = trigger;
    setChatInput(prefill);
    setChatOpen(true);
  }

  function handleDialogClose() {
    setChatOpen(false);
    chatTriggerRef.current?.focus();
  }

  async function sendChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const previous = chatMessages;
    const pending = [...previous, userMsg];
    setChatInput("");
    setChatMessages(pending);
    setChatAlert("");
    setChatLoading(true);

    const fail = (message: string) => {
      setChatMessages([...previous, { ...userMsg, isError: true }, { role: "assistant", content: message, isError: true }]);
      setChatAlert(message);
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: toApiHistory(pending), brief: DEMO_BRIEF }),
      });
      const data = (await res.json()) as ChatApiResponse;
      const events = data.guardrailEvents;
      if (events) setGuardrailLog((prev) => [...prev, ...events]);

      if (!res.ok) {
        fail(data.error ?? "Something went wrong. Please try again.");
      } else if (data.blocked) {
        setChatMessages([
          ...previous,
          { ...userMsg, blocked: true },
          { role: "assistant", content: data.response ?? "That message was blocked.", blocked: true },
        ]);
        setChatAlert("Your message was blocked by a safety guardrail.");
      } else {
        setChatMessages([...pending, { role: "assistant", content: data.response ?? "No response received." }]);
      }
    } catch {
      fail("Could not reach the server. Please check your connection.");
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <main className="pt-20 px-margin max-w-md mx-auto flex flex-col gap-space-lg pb-36">
      <h1 className="sr-only">Planning hub for Priya &amp; Arjun&apos;s wedding</h1>

      {/* Hero */}
      <section
        aria-labelledby="countdown-heading"
        className="relative overflow-hidden rounded-2xl bg-surface-container-lowest luxury-card gold-foil-top p-5 ambient-glow"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm font-label-sm bg-accent-container text-on-accent-container border border-secondary/20">
              <Icon name="stars" className="text-[13px] text-secondary" filled />
              Jaipur Royal Celebration
            </p>
            <h2
              id="countdown-heading"
              className="mt-2.5 font-display text-display-hero-mobile text-primary tracking-tight leading-tight"
            >
              {daysToGo ?? "—"}{" "}
              <span className="font-headline-sm text-headline-sm font-normal text-on-surface-variant italic">
                Days to Go
              </span>
            </h2>
          </div>
          <ReadinessRing percentage={readiness} />
        </div>

        <div
          className="rounded-xl p-3.5 bg-surface-container-low/90 border border-outline-variant/30 flex items-start gap-2.5"
          aria-live="polite"
        >
          <Icon name="auto_awesome" className="text-secondary shrink-0 mt-0.5" filled />
          <p className="font-body-md text-body-md text-primary font-medium leading-snug">
            {conflicts.length > 0 ? (
              <>
                <span className="text-error font-semibold">
                  {conflicts.length} issue{conflicts.length > 1 ? "s" : ""} detected.
                </span>{" "}
                {conflicts[0]?.message}
              </>
            ) : budget ? (
              <>
                Budget ready at{" "}
                <span className="text-on-success-container font-semibold">
                  {formatMoneyCompact(budget.perHead)} per guest
                </span>
                . {budget.lines.length} categories allocated with {(budget.contingencyPct * 100).toFixed(0)}%
                contingency.
              </>
            ) : (
              "Loading your plan…"
            )}
          </p>
        </div>
      </section>

      {/* Key metrics */}
      <section aria-labelledby="metrics-heading">
        <h2 id="metrics-heading" className="sr-only">
          Key metrics
        </h2>
        <div className="grid grid-cols-3 gap-2.5">
          <MetricTile
            label="Budget"
            value={budget ? formatMoneyCompact(budget.total) : "…"}
            subLabel={`${DEMO_BRIEF.guestCount} guests`}
            icon="payments"
          />
          <MetricTile
            label="Guests"
            value={String(DEMO_BRIEF.guestCount)}
            subLabel="RSVP pending"
            icon="group"
            iconColor="text-success"
          />
          <MetricTile
            label="Tasks"
            value={`${completedTasks}/${tasks.length}`}
            subLabel={`${urgentCount} urgent`}
            icon="checklist"
            iconColor="text-primary"
            progress={tasks.length > 0 ? completedTasks / tasks.length : 0}
          />
        </div>
      </section>

      {/* AI Concierge */}
      <section aria-labelledby="concierge-heading" className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Icon name="magic_button" className="text-secondary text-[18px]" filled />
            <h2 id="concierge-heading" className="font-headline-sm text-[17px] text-primary font-semibold">
              AI Concierge
            </h2>
          </div>
          <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Ask anything</span>
        </div>
        <PromptPillRow
          label="Suggested questions"
          pills={CONCIERGE_PROMPTS.map((p) => ({
            label: p.label,
            icon: p.icon,
            onClick: (e) => openChat(p.label, e.currentTarget),
          }))}
        />
      </section>

      {/* Budget allocation */}
      {budget && (
        <section aria-labelledby="hub-budget-heading" className="space-y-3">
          <h2 id="hub-budget-heading" className="font-headline-sm text-headline-sm text-primary font-semibold">
            Budget Allocation
          </h2>
          <ul className="space-y-2">
            {budget.lines.map((line) => {
              const pct = (line.allocated.amountMinor / budget.total.amountMinor) * 100;
              return (
                <li
                  key={line.category}
                  className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/20 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-title-md text-body-md font-semibold text-primary">{line.label}</span>
                    <span className="font-title-md text-title-md text-primary">
                      {formatMoneyCompact(line.allocated)}
                    </span>
                  </div>
                  <ProgressBar
                    value={pct}
                    label={`${line.label}: ${pct.toFixed(1)}% of total budget`}
                    className="h-1 bg-surface-container mt-2"
                  />
                  <details className="mt-1.5">
                    <summary className="inline-flex min-h-[24px] items-center text-label-sm font-semibold text-secondary">
                      Show the math<span className="sr-only"> for {line.label}</span>
                    </summary>
                    <p className="mt-1 text-label-sm text-on-surface-variant">{line.rationale}</p>
                    {line.sourceCitation && (
                      <p className="mt-0.5 text-[11px] text-on-surface-variant">Source: {line.sourceCitation}</p>
                    )}
                  </details>
                </li>
              );
            })}
            <li className="bg-accent-container rounded-xl p-3 border border-secondary/20">
              <div className="flex items-center justify-between">
                <span className="font-title-md text-body-md font-semibold text-on-accent-container">
                  Contingency ({(budget.contingencyPct * 100).toFixed(0)}%)
                </span>
                <span className="font-title-md text-title-md text-on-accent-container">
                  {formatMoneyCompact(budget.contingency)}
                </span>
              </div>
            </li>
          </ul>
        </section>
      )}

      {/* Active focus */}
      {sortedTasks.length > 0 && (
        <section aria-labelledby="focus-heading" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="focus-heading" className="font-headline-sm text-headline-sm text-primary font-semibold">
                Active Focus
              </h2>
              <p className="font-body-md text-label-sm text-on-surface-variant">Top priority tasks coming up</p>
            </div>
            <button
              type="button"
              aria-expanded={showAllTasks}
              aria-controls={taskListId}
              onClick={() => setShowAllTasks((v) => !v)}
              className="min-h-[44px] px-2 text-label-md font-label-md text-secondary font-semibold hover:underline"
            >
              {showAllTasks ? "Show fewer" : `View all (${tasks.length})`}
            </button>
          </div>
          <ul id={taskListId} className="space-y-2.5">
            {focusTasks.map((task) => {
              const daysUntil = nowMs === null ? null : daysBetween(nowMs, task.dueDate);
              const isUrgent = daysUntil !== null && daysUntil <= URGENT_WITHIN_DAYS;
              const isDone = task.status === "done";
              const checkboxId = `task-${task.id}`;
              return (
                <li
                  key={task.id}
                  className="bg-surface-container-lowest rounded-xl p-3.5 border border-outline-variant/20 hover:border-secondary/40 transition-all flex items-start gap-3 shadow-sm"
                >
                  <input
                    id={checkboxId}
                    type="checkbox"
                    checked={isDone}
                    onChange={() => toggleTask(task.id)}
                    className="mt-0.5 w-6 h-6 shrink-0 cursor-pointer accent-success"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-title-md text-body-lg font-semibold truncate">
                        <label
                          htmlFor={checkboxId}
                          className={`cursor-pointer ${isDone ? "line-through text-on-surface-variant" : "text-primary"}`}
                        >
                          {task.title}
                        </label>
                      </h3>
                      <span
                        className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-label-sm border capitalize ${
                          task.priority === "high"
                            ? "bg-success-container text-on-success-container border-success/20"
                            : "bg-surface-container text-on-surface-variant border-outline-variant/20"
                        }`}
                      >
                        <span className="sr-only">Priority: </span>
                        {task.priority}
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant mt-0.5 line-clamp-1">
                      {task.whyItMatters}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-label-sm font-label-sm text-on-surface-variant">
                      <span className={`flex items-center gap-1 ${isUrgent && !isDone ? "text-error font-semibold" : ""}`}>
                        <Icon name={isUrgent && !isDone ? "priority_high" : "event"} className="text-[14px]" />
                        {isUrgent && !isDone ? (
                          <>
                            <span className="sr-only">Urgent: </span>
                            Due in {daysUntil}d
                          </>
                        ) : (
                          <>
                            <span className="sr-only">Due </span>
                            <time dateTime={task.dueDate}>{task.dueDate}</time>
                          </>
                        )}
                      </span>
                      <span aria-hidden="true" className="text-outline">
                        &bull;
                      </span>
                      <span className="flex items-center gap-1 text-secondary">
                        <Icon name="auto_awesome" className="text-[14px]" />
                        AI prompt ready
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <section aria-labelledby="conflicts-heading" className="bg-error-container rounded-xl p-4 border border-error/20">
          <h2
            id="conflicts-heading"
            className="font-title-md text-title-md text-on-error-container font-semibold flex items-center gap-2"
          >
            <Icon name="warning" className="text-[18px]" />
            Plan Conflicts ({conflicts.length})
          </h2>
          <ul className="mt-2 space-y-1.5">
            {conflicts.map((c) => (
              <li key={`${c.kind}-${c.message}`} className="text-body-md text-on-error-container flex items-start gap-2">
                <Icon name={c.severity === "blocker" ? "block" : "error"} className="shrink-0 mt-0.5 text-[16px]" />
                <span>
                  <span className="font-semibold">{c.severity === "blocker" ? "Blocker: " : "Warning: "}</span>
                  {c.message}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Guardrail log — visible for demo / judges */}
      {guardrailLog.length > 0 && (
        <section aria-labelledby="guardrail-heading" className="bg-surface-container rounded-xl p-4 border border-outline-variant/30">
          <h2
            id="guardrail-heading"
            className="font-title-md text-title-md text-primary font-semibold flex items-center gap-2 mb-2"
          >
            <Icon name="shield" className="text-[18px]" />
            Guardrail Log
          </h2>
          <ul
            tabIndex={0}
            aria-labelledby="guardrail-heading"
            className="space-y-1 max-h-40 overflow-y-auto text-label-sm text-on-surface-variant font-mono rounded"
          >
            {guardrailLog.map((ev, i) => (
              <li key={`${ev.ruleId}-${i}`} className="flex items-center gap-2">
                <Icon
                  name={ev.verdict === "pass" ? "check_circle" : ev.verdict === "flag" ? "flag" : "block"}
                  className={`text-[14px] ${
                    ev.verdict === "pass" ? "text-success" : ev.verdict === "flag" ? "text-secondary" : "text-error"
                  }`}
                />
                <span>
                  {ev.ruleId}: {ev.verdict}
                  {ev.detail ? ` — ${ev.detail}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Chat dialog */}
      <dialog
        ref={dialogRef}
        aria-labelledby={dialogTitleId}
        onClose={handleDialogClose}
        className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none p-0 bg-surface text-on-surface open:flex open:flex-col backdrop:bg-primary/40"
      >
        <div className="flex items-center justify-between px-margin py-3 border-b border-outline-variant/30 bg-surface">
          <div className="flex items-center gap-2">
            <Icon name="auto_awesome" className="text-secondary" filled />
            <h2 id={dialogTitleId} className="font-headline-sm text-headline-sm text-primary font-semibold">
              AI Concierge
            </h2>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close chat"
            className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-variant transition-colors"
          >
            <Icon name="close" />
          </button>
        </div>

        <div
          role="log"
          aria-live="polite"
          aria-label="Conversation"
          tabIndex={0}
          className="flex-1 overflow-y-auto px-margin py-4 space-y-4"
        >
          {chatMessages.length === 0 && (
            <div className="text-center py-12 text-on-surface-variant">
              <Icon name="auto_awesome" className="text-[48px] text-secondary/40 block mb-3" filled />
              <p className="font-headline-sm text-headline-sm text-primary mb-1">How can I help?</p>
              <p className="font-body-md text-body-md">Ask me anything about your celebration planning.</p>
            </div>
          )}
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary-container text-surface"
                    : msg.blocked || msg.isError
                      ? "bg-error-container text-on-error-container border border-error/30"
                      : "champagne-pill text-primary"
                }`}
              >
                <span className="sr-only">{msg.role === "user" ? "You said: " : "Concierge said: "}</span>
                {msg.role === "assistant" && (msg.blocked || msg.isError) && (
                  <p className="flex items-center gap-1 text-label-sm font-semibold mb-1">
                    <Icon name={msg.blocked ? "shield" : "error"} className="text-[14px]" />
                    {msg.blocked ? "Blocked by guardrail" : "Error"}
                  </p>
                )}
                {msg.role === "assistant" && !msg.blocked && !msg.isError && (
                  <Icon name="auto_awesome" className="text-secondary text-[14px] mb-1 block" filled />
                )}
                <p className="font-body-md text-body-md whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start" aria-hidden="true">
              <div className="champagne-pill rounded-2xl px-4 py-3">
                <Icon name="auto_awesome" className="text-secondary animate-pulse text-[14px]" />
                <span className="text-body-md text-on-surface-variant ml-2">Thinking…</span>
              </div>
            </div>
          )}
        </div>

        <p role="status" className="sr-only">
          {chatLoading ? "The concierge is thinking…" : ""}
        </p>
        <p role="alert" className="sr-only">
          {chatAlert}
        </p>

        <form onSubmit={sendChat} className="px-margin py-3 border-t border-outline-variant/30 bg-surface">
          <label htmlFor={chatInputId} className="sr-only">
            Message the AI Concierge
          </label>
          <div className="flex items-center gap-2">
            <input
              id={chatInputId}
              ref={chatInputRef}
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Describe your celebration…"
              autoComplete="off"
              maxLength={4000}
              className="flex-1 min-h-[44px] px-4 py-3 rounded-full bg-surface-container-low border border-outline text-body-md focus:border-secondary"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || chatLoading}
              aria-label="Send message"
              className="w-11 h-11 rounded-full bg-primary-container text-surface flex items-center justify-center shadow hover:scale-95 transition-transform disabled:opacity-40"
            >
              <Icon name="send" className="text-[18px]" />
            </button>
          </div>
        </form>
      </dialog>
    </main>
  );
}
