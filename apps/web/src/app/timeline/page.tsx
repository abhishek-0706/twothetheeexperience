"use client";

import { useState, useMemo } from "react";
import type { RunOfShowItem, CascadeResult } from "@/lib/core/types";

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

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function TimelinePage() {
  const [view, setView] = useState<"milestones" | "runofshow">("runofshow");
  const [items, setItems] = useState<RunOfShowItem[]>(DEMO_ROS);
  const [cascadeResult, setCascadeResult] = useState<CascadeResult | null>(null);
  const [delayInput, setDelayInput] = useState("15");
  const [showCascade, setShowCascade] = useState(false);

  const activeItem = items.find((i) => i.status === "active");
  const activeIdx = items.findIndex((i) => i.status === "active");

  const handleCascade = async () => {
    if (!activeItem) return;
    const delayMin = parseInt(delayInput, 10);
    if (isNaN(delayMin) || delayMin <= 0) return;

    const { cascadeDelay } = await import("@/lib/core/cascade");
    const result = cascadeDelay(items, activeItem.id, delayMin);
    setCascadeResult(result);
    setShowCascade(true);
  };

  const applyCascade = () => {
    if (!cascadeResult) return;
    setItems(cascadeResult.items);
    setCascadeResult(null);
    setShowCascade(false);
  };

  // Weather for the demo
  const weather = { temp: "34°C", desc: "Clear & Sunny", icon: "sunny" };

  // Metrics
  const completedCount = items.filter((i) => i.status === "completed").length;
  const vendorLeadSet = new Set(items.flatMap((i) => i.vendorLeads));
  const pace = activeItem
    ? (() => {
        const now = new Date();
        const expectedMin = activeItem.startMin + activeItem.durationMin;
        const currentMin = now.getHours() * 60 + now.getMinutes();
        if (currentMin <= expectedMin) return "On Time";
        return `${currentMin - expectedMin}m Behind`;
      })()
    : "—";

  return (
    <main className="pt-20 px-margin max-w-md mx-auto flex flex-col gap-space-lg pb-36">
      {/* Page Header */}
      <section className="flex flex-col gap-space-md pt-2">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-label-md font-label-md text-secondary uppercase tracking-widest font-semibold block mb-0.5">
              Real-Time Coordination
            </span>
            <h1 className="text-headline-lg-mobile font-display text-primary font-semibold">
              Timeline & Run-of-Show
            </h1>
          </div>
          <div className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-full border border-success/20">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-label-sm font-label-sm text-success">Live Sync</span>
          </div>
        </div>

        {/* Segmented Switcher */}
        <div className="p-1 bg-surface-container-high rounded-full flex items-center shadow-inner">
          <button
            onClick={() => setView("milestones")}
            className={`flex-1 py-2 text-center text-label-md font-label-md rounded-full transition-all duration-200 ${
              view === "milestones"
                ? "bg-primary-container text-surface-container-lowest font-semibold shadow-md"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            High-Level Milestones
          </button>
          <button
            onClick={() => setView("runofshow")}
            className={`flex-1 py-2 text-center text-label-md font-label-md rounded-full transition-all duration-200 ${
              view === "runofshow"
                ? "bg-primary-container text-surface-container-lowest font-semibold shadow-md"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            Day-Of Run-of-Show
          </button>
        </div>
      </section>

      {view === "runofshow" && (
        <>
          {/* Event Day Banner */}
          <section className="luxury-card gold-foil-top bg-surface-container-lowest rounded-xl p-space-md flex flex-col gap-space-sm relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-32 h-32 rounded-full bg-secondary-fixed/20 blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-secondary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  celebration
                </span>
                <span className="text-label-sm font-label-sm text-secondary font-bold tracking-wider uppercase">
                  Ceremony Day
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-success-container border border-success/20 text-success">
                <span className="material-symbols-outlined text-[14px]">{weather.icon}</span>
                <span className="text-label-sm font-label-sm font-semibold">
                  {weather.temp} {weather.desc}
                </span>
              </div>
            </div>
            <div className="mt-0.5">
              <h2 className="text-headline-sm font-display text-primary font-semibold">
                Saturday, February 14 &bull; Rambagh Palace
              </h2>
              <p className="text-body-md font-body-md text-on-surface-variant flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-[16px] text-outline">
                  location_on
                </span>
                Bhawani Singh Road, Jaipur, Rajasthan
              </p>
            </div>
            {/* Metrics Strip */}
            <div className="grid grid-cols-3 pt-space-xs mt-1 border-t border-surface-container-high text-center">
              <div>
                <span className="text-label-sm font-label-sm text-on-surface-variant block">
                  Total Guests
                </span>
                <span className="text-title-md font-title-md text-primary font-bold">350</span>
              </div>
              <div className="border-x border-surface-container-high">
                <span className="text-label-sm font-label-sm text-on-surface-variant block">
                  Vendors On Site
                </span>
                <span className="text-title-md font-title-md text-primary font-bold">
                  {vendorLeadSet.size} Active
                </span>
              </div>
              <div>
                <span className="text-label-sm font-label-sm text-on-surface-variant block">
                  Schedule Pace
                </span>
                <span
                  className={`text-title-md font-title-md font-bold ${
                    pace === "On Time" ? "text-success" : "text-error"
                  }`}
                >
                  {pace}
                </span>
              </div>
            </div>
          </section>

          {/* Delay Cascade Card */}
          <section className="champagne-pill rounded-xl p-space-md shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-container text-secondary-fixed flex items-center justify-center shrink-0 shadow-sm">
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  auto_awesome
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-label-md font-label-md font-bold text-primary">
                    Emergency Day-Of Orchestration
                  </span>
                  <span className="text-label-sm font-label-sm text-secondary font-semibold">
                    AI Copilot
                  </span>
                </div>
                <p className="text-body-md font-body-md text-primary-container mt-1 font-medium">
                  Run-of-Show running behind?
                </p>
                <p className="text-label-md font-label-md text-on-surface-variant mt-0.5">
                  Recalculate downstream vendor alerts, kitchen fire times & musical transitions.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={handleCascade}
                    className="px-3.5 py-1.5 rounded-full bg-primary text-surface font-label-md text-label-md font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
                  >
                    <span>Recalculate +{delayInput}m</span>
                    <span className="material-symbols-outlined text-[14px]">bolt</span>
                  </button>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={delayInput}
                      onChange={(e) => setDelayInput(e.target.value)}
                      className="w-14 px-2 py-1.5 rounded-full bg-surface-container-lowest/80 text-primary font-label-md text-label-md text-center border border-secondary/30 focus:outline-none focus:ring-1 focus:ring-secondary"
                      min="1"
                      max="120"
                    />
                    <span className="text-label-sm text-on-surface-variant">min</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Cascade Preview */}
          {showCascade && cascadeResult && (
            <section className="bg-accent-container rounded-xl p-4 border border-secondary/30 space-y-3">
              <h3 className="font-title-md text-title-md text-on-accent-container font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">schedule</span>
                Cascade Preview
              </h3>
              {cascadeResult.shifted.length > 0 && (
                <div className="space-y-1">
                  {cascadeResult.shifted.map((s) => {
                    const item = cascadeResult.items.find((i) => i.id === s.itemId);
                    return (
                      <div key={s.itemId} className="text-body-md text-primary flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px] text-secondary">
                          arrow_forward
                        </span>
                        <span className="font-medium">{item?.title || s.itemId}</span>
                        <span className="text-on-surface-variant">
                          {minutesToTime(s.fromMin)} → {minutesToTime(s.toMin)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              {cascadeResult.violations.length > 0 && (
                <div className="bg-error-container/50 rounded-lg p-3 space-y-1">
                  <span className="font-label-md text-error font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">warning</span>
                    Violations
                  </span>
                  {cascadeResult.violations.map((v, i) => (
                    <p key={i} className="text-body-md text-on-error-container">{v.message}</p>
                  ))}
                </div>
              )}
              <div className="text-label-md text-on-surface-variant">
                Absorbed: {cascadeResult.absorbedMin}m | Net delay: {cascadeResult.netDelayMin}m |
                Vendors to notify: {cascadeResult.affectedVendorLeads.join(", ")}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={applyCascade}
                  className="px-4 py-2 rounded-full bg-primary text-surface font-label-md text-label-md font-semibold active:scale-95 transition-transform"
                >
                  Apply Changes
                </button>
                <button
                  onClick={() => {
                    setCascadeResult(null);
                    setShowCascade(false);
                  }}
                  className="px-4 py-2 rounded-full bg-surface-container-lowest text-primary font-label-md text-label-md font-medium border border-secondary/30 active:scale-95 transition-transform"
                >
                  Cancel
                </button>
              </div>
            </section>
          )}

          {/* Timeline Track */}
          <section className="flex flex-col gap-space-sm pt-1">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-title-md font-title-md text-primary">Day-Of Execution Plan</h3>
              <span className="text-label-sm font-label-sm text-secondary font-medium">
                {items.length} Events
              </span>
            </div>

            <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-[11px] before:top-4 before:bottom-4 before:w-[2px] before:bg-surface-variant">
              {items.map((item, idx) => {
                const isActive = item.status === "active";
                const isCompleted = item.status === "completed";
                const endMin = item.startMin + item.durationMin;

                return (
                  <div key={item.id} className="relative group">
                    {/* Timeline Marker */}
                    <div
                      className={`absolute -left-6 top-3 w-5 h-5 rounded-full flex items-center justify-center z-10 ${
                        isCompleted
                          ? "bg-success-container border-2 border-success"
                          : isActive
                          ? "bg-secondary-container border-2 border-secondary shadow-sm animate-pulse"
                          : "bg-surface-container-highest border-2 border-outline"
                      }`}
                      aria-label={`${item.title} — ${item.status}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isCompleted ? "bg-success" : isActive ? "bg-primary-container" : "bg-outline"
                        }`}
                      />
                    </div>

                    <div
                      className={`luxury-card bg-surface-container-lowest rounded-xl p-space-md transition-all hover:border-secondary/30 ${
                        isActive ? "border-l-4 border-l-secondary ring-1 ring-secondary/20" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-label-sm font-label-sm font-bold tracking-wider ${
                            isCompleted || isActive ? "text-secondary" : "text-outline"
                          }`}
                        >
                          {minutesToTime(item.startMin)} — {minutesToTime(endMin)}
                        </span>

                        {/* Status / Tag Pill */}
                        {isCompleted && (
                          <span className="px-2 py-0.5 rounded-full bg-success-container text-on-success-container text-label-sm font-label-sm font-semibold border border-success/25 flex items-center gap-1">
                            <span
                              className="material-symbols-outlined text-[12px]"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              check_circle
                            </span>
                            Completed
                          </span>
                        )}
                        {isActive && (
                          <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed/50 text-secondary font-label-sm text-label-sm font-bold">
                            Now
                          </span>
                        )}
                        {!isCompleted && !isActive && item.tag && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-label-sm font-label-sm font-semibold ${
                              item.tag.includes("Muhurat") || item.tag.includes("Major")
                                ? "bg-tertiary-fixed text-tertiary"
                                : item.tag === "Photo Milestone"
                                ? "bg-accent-container text-on-accent-container"
                                : "bg-surface-container text-on-surface-variant"
                            }`}
                          >
                            {item.tag}
                          </span>
                        )}
                      </div>

                      <h4 className="text-title-md font-title-md text-primary mt-1">{item.title}</h4>

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-label-md font-label-md text-on-surface-variant">
                        {item.vendorLeads.length > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px] text-secondary">
                              person
                            </span>
                            {item.vendorLeads.join(", ")}
                          </span>
                        )}
                        {item.location && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px] text-secondary">
                              meeting_room
                            </span>
                            {item.location}
                          </span>
                        )}
                      </div>

                      {/* Pinned reason */}
                      {item.pinned && item.pinnedReason && (
                        <div className="mt-2 p-2 rounded-lg bg-tertiary-fixed/30 border border-tertiary/20">
                          <span className="text-label-sm font-label-sm text-tertiary flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">lock</span>
                            {item.pinnedReason}
                          </span>
                        </div>
                      )}

                      {/* Nested Checklist */}
                      {item.checklist.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-surface-container-high flex flex-col gap-1.5">
                          <span className="text-label-sm font-label-sm text-outline font-semibold uppercase">
                            Day-Of Checklist
                          </span>
                          {item.checklist.map((check, ci) => (
                            <label key={ci} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={check.done}
                                readOnly
                                aria-checked={check.done}
                                className="w-4 h-4 rounded-full text-success border-outline-variant focus:ring-0"
                              />
                              <span
                                className={`text-body-md font-body-md text-on-surface ${
                                  check.done ? "line-through opacity-80" : ""
                                }`}
                              >
                                {check.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Vendor Broadcast */}
          <section className="bg-surface-container-lowest rounded-xl p-space-md border border-outline-variant/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-secondary-fixed/40 flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary text-[18px]">
                  radio_button_checked
                </span>
              </div>
              <div>
                <span className="text-title-md font-title-md text-primary block leading-tight">
                  Broadcast Vendor Whisper
                </span>
                <span className="text-label-sm font-label-sm text-on-surface-variant">
                  Send silent sync to all {vendorLeadSet.size} vendor leads
                </span>
              </div>
            </div>
            <button
              onClick={() =>
                alert(
                  `[Confirm-tier action]\n\nThis would send a status update to:\n${[...vendorLeadSet].join("\n")}\n\nIn production, you'd see the exact message and approve before it sends.`
                )
              }
              className="w-8 h-8 rounded-full bg-primary-container text-surface flex items-center justify-center shadow hover:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </section>
        </>
      )}

      {view === "milestones" && (
        <section className="text-center py-12 text-on-surface-variant">
          <span className="material-symbols-outlined text-[48px] text-secondary/30 block mb-3">
            calendar_month
          </span>
          <p className="font-headline-sm text-headline-sm text-primary mb-1">
            High-Level Milestones
          </p>
          <p className="font-body-md text-body-md">
            Switch to the Hub to see your full planning timeline, or use the Run-of-Show view for ceremony day coordination.
          </p>
        </section>
      )}
    </main>
  );
}
