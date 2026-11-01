"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Icon from "@/components/ui/Icon";
import type { CascadeResult, RunOfShowItem } from "@/lib/core/types";

const VIEW_OPTIONS = [
  { key: "milestones", label: "High-Level Milestones" },
  { key: "runofshow", label: "Day-Of Run-of-Show" },
] as const;

// Demo run-of-show data — an Indian wedding ceremony day in Jaipur
const DEMO_ROS: RunOfShowItem[] = [
  {
    id: "bride-prep",
    title: "Bridal Suite — Hair, Makeup & Mehndi Touch-up",
    startMin: 8 * 60,
    durationMin: 180,
    minDurationMin: 150,
    dependsOn: [],
    pinned: false,
    pinnedReason: null,
    vendorLeads: ["Sakshi Makeup Studio"],
    location: "Suite 201, Rambagh Palace",
    status: "completed",
    tag: null,
    checklist: [
      { label: "Mimosas & naashta delivered to suite", done: true },
      { label: "Photographer arrival at 9:30 AM", done: true },
    ],
  },
  {
    id: "baraat-lineup",
    title: "Baraat Assembly & Dhol Rehearsal",
    startMin: 14 * 60,
    durationMin: 60,
    minDurationMin: 45,
    dependsOn: ["bride-prep"],
    pinned: false,
    pinnedReason: null,
    vendorLeads: ["Punjab Dhol Academy", "Royal Horse & Buggy"],
    location: "Front Portico",
    status: "completed",
    tag: "Photo Milestone",
    checklist: [
      { label: "Mare decorated and saddled", done: true },
      { label: "Groom's sehra tied", done: true },
    ],
  },
  {
    id: "baraat",
    title: "Baraat Procession to Mandap",
    startMin: 15 * 60,
    durationMin: 60,
    minDurationMin: 45,
    dependsOn: ["baraat-lineup"],
    pinned: false,
    pinnedReason: null,
    vendorLeads: ["Punjab Dhol Academy", "Marco Photography"],
    location: "Main Driveway → Mandap Garden",
    status: "active",
    tag: null,
    checklist: [],
  },
  {
    id: "jaimala",
    title: "Jaimala & Milni Ceremony",
    startMin: 16 * 60,
    durationMin: 30,
    minDurationMin: 25,
    dependsOn: ["baraat"],
    pinned: false,
    pinnedReason: null,
    vendorLeads: ["Pandit Sharma", "Jasmine Décor"],
    location: "Mandap Garden",
    status: "upcoming",
    tag: "Major Milestone",
    checklist: [],
  },
  {
    id: "pheras",
    title: "Pheras — Sacred Ceremony",
    startMin: 16 * 60 + 45,
    durationMin: 75,
    minDurationMin: 60,
    dependsOn: ["jaimala"],
    pinned: true,
    pinnedReason: "Muhurat window: 4:45 PM–6:00 PM (Pandit Sharma confirmed)",
    vendorLeads: ["Pandit Sharma"],
    location: "Mandap Garden",
    status: "upcoming",
    tag: "Pinned — Muhurat",
    checklist: [],
  },
  {
    id: "vidaai",
    title: "Vidaai & Family Portraits",
    startMin: 18 * 60,
    durationMin: 30,
    minDurationMin: 20,
    dependsOn: ["pheras"],
    pinned: false,
    pinnedReason: null,
    vendorLeads: ["Marco Photography"],
    location: "Palace Entrance",
    status: "upcoming",
    tag: null,
    checklist: [],
  },
  {
    id: "reception",
    title: "Reception Dinner & Dance Floor",
    startMin: 19 * 60,
    durationMin: 180,
    minDurationMin: 120,
    dependsOn: ["vidaai"],
    pinned: false,
    pinnedReason: null,
    vendorLeads: ["Royal Caterers", "DJ Akhil", "Jasmine Décor"],
    location: "Sheesh Mahal Banquet Hall",
    status: "upcoming",
    tag: "Reception",
    checklist: [],
  },
];

const MIN_DELAY = 1;
const MAX_DELAY = 120;

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** HH:MM for the <time dateTime> attribute. */
function isoTime(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

function TimeRange({ start, end }: { start: number; end: number }) {
  return (
    <>
      <time dateTime={isoTime(start)}>{minutesToTime(start)}</time>
      <span aria-hidden="true"> — </span>
      <span className="sr-only"> to </span>
      <time dateTime={isoTime(end)}>{minutesToTime(end)}</time>
    </>
  );
}

export default function TimelinePage() {
  const [view, setView] = useState<"milestones" | "runofshow">("runofshow");
  const [items, setItems] = useState<RunOfShowItem[]>(DEMO_ROS);
  const [cascadeResult, setCascadeResult] = useState<CascadeResult | null>(null);
  const [delayInput, setDelayInput] = useState("15");
  const [delayError, setDelayError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [nowMin, setNowMin] = useState<number | null>(null);

  const recalcButtonRef = useRef<HTMLButtonElement>(null);
  const previewHeadingRef = useRef<HTMLHeadingElement>(null);
  const delayInputId = useId();
  const delayHintId = useId();
  const delayErrorId = useId();

  // Clock-dependent pace is computed after mount so server and client HTML match.
  useEffect(() => {
    const now = new Date();
    setNowMin(now.getHours() * 60 + now.getMinutes());
  }, []);

  useEffect(() => {
    if (cascadeResult) previewHeadingRef.current?.focus();
  }, [cascadeResult]);

  const activeItem = items.find((i) => i.status === "active");
  const vendorLeadSet = new Set(items.flatMap((i) => i.vendorLeads));
  const activeEndMin = activeItem ? activeItem.startMin + activeItem.durationMin : null;
  const pace =
    activeEndMin === null || nowMin === null
      ? "—"
      : nowMin <= activeEndMin
        ? "On Time"
        : `${nowMin - activeEndMin}m Behind`;

  async function handleCascade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeItem) return;
    const delayMin = Number(delayInput);
    if (!Number.isInteger(delayMin) || delayMin < MIN_DELAY || delayMin > MAX_DELAY) {
      setDelayError(`Enter a whole number of minutes between ${MIN_DELAY} and ${MAX_DELAY}.`);
      return;
    }
    setDelayError("");

    const { cascadeDelay } = await import("@/lib/core/cascade");
    const result = cascadeDelay(items, activeItem.id, delayMin);
    const moved = result.shifted.length;
    const violations = result.violations.length;
    setCascadeResult(result);
    setAnnouncement(
      `Preview ready: ${moved} item${moved === 1 ? "" : "s"} would move, ` +
        (violations > 0
          ? `${violations} pinned-time violation${violations === 1 ? "" : "s"}.`
          : "no violations.")
    );
  }

  function closePreview(message: string) {
    setCascadeResult(null);
    setAnnouncement(message);
    recalcButtonRef.current?.focus();
  }

  function applyCascade() {
    if (!cascadeResult) return;
    setItems(cascadeResult.items);
    closePreview(`Schedule updated. ${cascadeResult.shifted.length} items moved.`);
  }

  function toggleChecklistItem(itemId: string, index: number) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              checklist: item.checklist.map((c, i) => (i === index ? { ...c, done: !c.done } : c)),
            }
          : item
      )
    );
  }

  const weather = { temp: "34°C", desc: "Clear & Sunny", icon: "sunny" };

  return (
    <main className="pt-20 px-margin max-w-md mx-auto flex flex-col gap-space-lg pb-36">
      <header className="flex flex-col gap-space-md pt-2">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <p className="text-label-md font-label-md text-secondary uppercase tracking-widest font-semibold mb-0.5">
              Real-Time Coordination
            </p>
            <h1 className="text-headline-lg-mobile font-display text-primary font-semibold">
              Timeline &amp; Run-of-Show
            </h1>
          </div>
          <p className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-full border border-success/20">
            <span aria-hidden="true" className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-label-sm font-label-sm text-on-success-container">Live Sync</span>
          </p>
        </div>

        <div
          role="group"
          aria-label="Timeline view"
          className="p-1 bg-surface-container-high rounded-full flex items-center shadow-inner"
        >
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setView(option.key)}
              aria-pressed={view === option.key}
              className={`flex-1 min-h-[44px] py-2 text-center text-label-md font-label-md rounded-full transition-all duration-200 ${
                view === option.key
                  ? "bg-primary-container text-surface-container-lowest font-semibold shadow-md"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {view === "runofshow" && (
        <>
          {/* Event day banner */}
          <section
            aria-labelledby="event-day-heading"
            className="luxury-card gold-foil-top bg-surface-container-lowest rounded-xl p-space-md flex flex-col gap-space-sm relative overflow-hidden"
          >
            <div
              aria-hidden="true"
              className="absolute -right-10 -bottom-10 w-32 h-32 rounded-full bg-secondary-fixed/20 blur-2xl pointer-events-none"
            />
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-label-sm font-label-sm text-secondary font-bold tracking-wider uppercase">
                <Icon name="celebration" className="text-secondary" filled />
                Ceremony Day
              </p>
              <p className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-success-container border border-success/20 text-on-success-container">
                <Icon name={weather.icon} className="text-[14px]" />
                <span className="text-label-sm font-label-sm font-semibold">
                  <span className="sr-only">Weather: </span>
                  {weather.temp} {weather.desc}
                </span>
              </p>
            </div>
            <div className="mt-0.5">
              <h2
                id="event-day-heading"
                className="text-headline-sm font-display text-primary font-semibold"
              >
                <time dateTime="2027-02-14">Saturday, February 14</time> &bull; Rambagh Palace
              </h2>
              <p className="text-body-md font-body-md text-on-surface-variant flex items-center gap-1 mt-0.5">
                <Icon name="location_on" className="text-[16px] text-outline" />
                Bhawani Singh Road, Jaipur, Rajasthan
              </p>
            </div>
            <dl className="grid grid-cols-3 pt-space-xs mt-1 border-t border-surface-container-high text-center">
              <div>
                <dt className="text-label-sm font-label-sm text-on-surface-variant">
                  Total Guests
                </dt>
                <dd className="text-title-md font-title-md text-primary font-bold">350</dd>
              </div>
              <div className="border-x border-surface-container-high">
                <dt className="text-label-sm font-label-sm text-on-surface-variant">
                  Vendors On Site
                </dt>
                <dd className="text-title-md font-title-md text-primary font-bold">
                  {vendorLeadSet.size} Active
                </dd>
              </div>
              <div>
                <dt className="text-label-sm font-label-sm text-on-surface-variant">
                  Schedule Pace
                </dt>
                <dd
                  className={`text-title-md font-title-md font-bold ${
                    pace === "On Time"
                      ? "text-success"
                      : pace === "—"
                        ? "text-on-surface-variant"
                        : "text-error"
                  }`}
                >
                  {pace}
                </dd>
              </div>
            </dl>
          </section>

          {/* Delay cascade */}
          <section
            aria-labelledby="orchestration-heading"
            className="champagne-pill rounded-xl p-space-md shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div
                aria-hidden="true"
                className="w-10 h-10 rounded-full bg-primary-container text-secondary-fixed flex items-center justify-center shrink-0 shadow-sm"
              >
                <Icon name="auto_awesome" filled />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2
                    id="orchestration-heading"
                    className="text-label-md font-label-md font-bold text-primary"
                  >
                    Emergency Day-Of Orchestration
                  </h2>
                  <span className="text-label-sm font-label-sm text-secondary font-semibold">
                    AI Copilot
                  </span>
                </div>
                <p className="text-body-md font-body-md text-primary-container mt-1 font-medium">
                  Run-of-Show running behind?
                </p>
                <p className="text-label-md font-label-md text-on-surface-variant mt-0.5">
                  Recalculate downstream vendor alerts, kitchen fire times &amp; musical transitions
                  {activeItem ? ` from “${activeItem.title}”` : ""}.
                </p>
                <form
                  onSubmit={handleCascade}
                  noValidate
                  className="mt-3 flex flex-wrap items-center gap-2"
                >
                  <button
                    ref={recalcButtonRef}
                    type="submit"
                    disabled={!activeItem}
                    className="min-h-[44px] px-3.5 py-1.5 rounded-full bg-primary text-surface font-label-md text-label-md font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform disabled:opacity-40"
                  >
                    Recalculate +{delayInput || 0}m
                    <Icon name="bolt" className="text-[14px]" />
                  </button>
                  <div className="flex items-center gap-1">
                    <label htmlFor={delayInputId} className="sr-only">
                      Delay
                    </label>
                    <input
                      id={delayInputId}
                      type="number"
                      inputMode="numeric"
                      value={delayInput}
                      onChange={(e) => setDelayInput(e.target.value)}
                      min={MIN_DELAY}
                      max={MAX_DELAY}
                      step={1}
                      aria-describedby={delayError ? `${delayHintId} ${delayErrorId}` : delayHintId}
                      aria-invalid={delayError ? true : undefined}
                      className="w-16 min-h-[44px] px-2 rounded-full bg-surface-container-lowest text-primary font-label-md text-label-md text-center border border-outline focus:border-secondary"
                    />
                    <span id={delayHintId} className="text-label-sm text-on-surface-variant">
                      minutes
                      <span className="sr-only">
                        {" "}
                        (between {MIN_DELAY} and {MAX_DELAY})
                      </span>
                    </span>
                  </div>
                  {delayError && (
                    <p
                      id={delayErrorId}
                      role="alert"
                      className="w-full text-label-sm text-error font-semibold"
                    >
                      {delayError}
                    </p>
                  )}
                </form>
              </div>
            </div>
          </section>

          {/* Cascade preview */}
          {cascadeResult && (
            <section
              aria-labelledby="preview-heading"
              className="bg-accent-container rounded-xl p-4 border border-secondary/30 space-y-3"
            >
              <h2
                id="preview-heading"
                ref={previewHeadingRef}
                tabIndex={-1}
                className="font-title-md text-title-md text-on-accent-container font-semibold flex items-center gap-2"
              >
                <Icon name="schedule" className="text-[18px]" />
                Cascade Preview
              </h2>
              {cascadeResult.shifted.length > 0 && (
                <ul className="space-y-1" aria-label="Items that would move">
                  {cascadeResult.shifted.map((s) => {
                    const item = cascadeResult.items.find((i) => i.id === s.itemId);
                    return (
                      <li
                        key={s.itemId}
                        className="text-body-md text-primary flex flex-wrap items-center gap-x-2"
                      >
                        <Icon name="arrow_forward" className="text-[14px] text-secondary" />
                        <span className="font-medium">{item?.title ?? s.itemId}</span>
                        <span className="text-on-surface-variant">
                          <span className="sr-only">moves from </span>
                          <TimeRange start={s.fromMin} end={s.toMin} />
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {cascadeResult.violations.length > 0 && (
                <div className="bg-error-container/50 rounded-lg p-3 space-y-1">
                  <h3 className="font-label-md text-error font-semibold flex items-center gap-1">
                    <Icon name="warning" className="text-[14px]" />
                    Violations
                  </h3>
                  <ul className="space-y-1">
                    {cascadeResult.violations.map((v) => (
                      <li key={v.message} className="text-body-md text-on-error-container">
                        {v.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <dl className="text-label-md text-on-surface-variant flex flex-wrap gap-x-3 gap-y-1">
                <div className="flex gap-1">
                  <dt>Absorbed:</dt>
                  <dd>{cascadeResult.absorbedMin}m</dd>
                </div>
                <div className="flex gap-1">
                  <dt>Net delay:</dt>
                  <dd>{cascadeResult.netDelayMin}m</dd>
                </div>
                <div className="flex gap-1">
                  <dt>Vendors to notify:</dt>
                  <dd>{cascadeResult.affectedVendorLeads.join(", ") || "None"}</dd>
                </div>
              </dl>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={applyCascade}
                  className="min-h-[44px] px-4 py-2 rounded-full bg-primary text-surface font-label-md text-label-md font-semibold active:scale-95 transition-transform"
                >
                  Apply Changes
                </button>
                <button
                  type="button"
                  onClick={() => closePreview("Preview cancelled. Schedule unchanged.")}
                  className="min-h-[44px] px-4 py-2 rounded-full bg-surface-container-lowest text-primary font-label-md text-label-md font-medium border border-secondary/30 active:scale-95 transition-transform"
                >
                  Cancel
                </button>
              </div>
            </section>
          )}

          {/* Timeline track */}
          <section aria-labelledby="plan-heading" className="flex flex-col gap-space-sm pt-1">
            <div className="flex items-center justify-between mb-1">
              <h2 id="plan-heading" className="text-title-md font-title-md text-primary">
                Day-Of Execution Plan
              </h2>
              <span className="text-label-sm font-label-sm text-secondary font-medium">
                {items.length} Events
              </span>
            </div>

            <ol className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-[11px] before:top-4 before:bottom-4 before:w-[2px] before:bg-surface-variant">
              {items.map((item) => {
                const isActive = item.status === "active";
                const isCompleted = item.status === "completed";
                const endMin = item.startMin + item.durationMin;

                return (
                  <li
                    key={item.id}
                    className="relative"
                    aria-current={isActive ? "step" : undefined}
                  >
                    <div
                      aria-hidden="true"
                      className={`absolute -left-6 top-3 w-5 h-5 rounded-full flex items-center justify-center z-10 ${
                        isCompleted
                          ? "bg-success-container border-2 border-success"
                          : isActive
                            ? "bg-secondary-container border-2 border-secondary shadow-sm animate-pulse"
                            : "bg-surface-container-highest border-2 border-outline"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isCompleted
                            ? "bg-success"
                            : isActive
                              ? "bg-primary-container"
                              : "bg-outline"
                        }`}
                      />
                    </div>

                    <article
                      aria-labelledby={`ros-${item.id}`}
                      className={`luxury-card bg-surface-container-lowest rounded-xl p-space-md transition-all hover:border-secondary/30 ${
                        isActive ? "border-l-4 border-l-secondary ring-1 ring-secondary/20" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-label-sm font-label-sm font-bold tracking-wider ${
                            isCompleted || isActive ? "text-secondary" : "text-outline"
                          }`}
                        >
                          <TimeRange start={item.startMin} end={endMin} />
                        </span>

                        {isCompleted && (
                          <span className="px-2 py-0.5 rounded-full bg-success-container text-on-success-container text-label-sm font-label-sm font-semibold border border-success/25 flex items-center gap-1">
                            <Icon name="check_circle" className="text-[12px]" filled />
                            Completed
                          </span>
                        )}
                        {isActive && (
                          <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed/50 text-secondary font-label-sm text-label-sm font-bold">
                            Now<span className="sr-only">, in progress</span>
                          </span>
                        )}
                        {!isCompleted && !isActive && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-label-sm font-label-sm font-semibold flex items-center gap-1 ${
                              item.pinned || item.tag?.includes("Major")
                                ? "bg-tertiary-fixed text-tertiary"
                                : item.tag === "Photo Milestone"
                                  ? "bg-accent-container text-on-accent-container"
                                  : "bg-surface-container text-on-surface-variant"
                            }`}
                          >
                            {item.pinned && <Icon name="lock" className="text-[12px]" />}
                            {item.tag ?? "Upcoming"}
                          </span>
                        )}
                      </div>

                      <h3
                        id={`ros-${item.id}`}
                        className="text-title-md font-title-md text-primary mt-1"
                      >
                        {item.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-label-md font-label-md text-on-surface-variant">
                        {item.vendorLeads.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Icon name="person" className="text-[14px] text-secondary" />
                            <span className="sr-only">Vendor leads: </span>
                            {item.vendorLeads.join(", ")}
                          </span>
                        )}
                        {item.location && (
                          <span className="flex items-center gap-1">
                            <Icon name="meeting_room" className="text-[14px] text-secondary" />
                            <span className="sr-only">Location: </span>
                            {item.location}
                          </span>
                        )}
                      </div>

                      {item.pinned && item.pinnedReason && (
                        <p className="mt-2 p-2 rounded-lg bg-tertiary-fixed/30 border border-tertiary/20 text-label-sm font-label-sm text-tertiary flex items-center gap-1">
                          <Icon name="lock" className="text-[14px]" />
                          <span className="sr-only">Pinned, cannot be moved: </span>
                          {item.pinnedReason}
                        </p>
                      )}

                      {item.checklist.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-surface-container-high">
                          <h4
                            id={`checklist-${item.id}`}
                            className="text-label-sm font-label-sm text-outline font-semibold uppercase mb-1.5"
                          >
                            Day-Of Checklist
                          </h4>
                          <ul
                            aria-labelledby={`checklist-${item.id}`}
                            className="flex flex-col gap-1.5"
                          >
                            {item.checklist.map((check, ci) => (
                              <li key={check.label}>
                                <label className="flex items-center gap-2 min-h-[24px] cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={check.done}
                                    onChange={() => toggleChecklistItem(item.id, ci)}
                                    className="w-5 h-5 shrink-0 accent-success"
                                  />
                                  <span
                                    className={`text-body-md font-body-md text-on-surface ${check.done ? "line-through" : ""}`}
                                  >
                                    {check.label}
                                  </span>
                                </label>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </article>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Vendor broadcast */}
          <section
            aria-labelledby="broadcast-heading"
            className="bg-surface-container-lowest rounded-xl p-space-md border border-outline-variant/30 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5">
              <div
                aria-hidden="true"
                className="w-8 h-8 rounded-full bg-secondary-fixed/40 flex items-center justify-center"
              >
                <Icon name="radio_button_checked" className="text-secondary text-[18px]" />
              </div>
              <div>
                <h2
                  id="broadcast-heading"
                  className="text-title-md font-title-md text-primary leading-tight"
                >
                  Broadcast Vendor Whisper
                </h2>
                <p className="text-label-sm font-label-sm text-on-surface-variant">
                  Send silent sync to all {vendorLeadSet.size} vendor leads
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                window.alert(
                  `[Confirm-tier action]\n\nThis would send a status update to:\n${[...vendorLeadSet].join("\n")}\n\nIn production, you'd see the exact message and approve before it sends.`
                )
              }
              aria-label="Preview vendor broadcast"
              className="w-11 h-11 shrink-0 rounded-full bg-primary-container text-surface flex items-center justify-center shadow hover:scale-95 transition-transform"
            >
              <Icon name="send" className="text-[18px]" />
            </button>
          </section>
        </>
      )}

      {view === "milestones" && (
        <section
          aria-labelledby="milestones-heading"
          className="text-center py-12 text-on-surface-variant"
        >
          <Icon name="calendar_month" className="text-[48px] text-secondary/40 block mb-3" />
          <h2
            id="milestones-heading"
            className="font-headline-sm text-headline-sm text-primary mb-1"
          >
            High-Level Milestones
          </h2>
          <p className="font-body-md text-body-md">
            Switch to the Hub to see your full planning timeline, or use the Run-of-Show view for
            ceremony day coordination.
          </p>
        </section>
      )}
    </main>
  );
}
