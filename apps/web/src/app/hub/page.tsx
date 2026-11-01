"use client";

import { useRef, useState } from "react";
import ChatDialog from "@/components/chat/ChatDialog";
import BudgetBreakdown from "@/components/hub/BudgetBreakdown";
import ConciergePrompts from "@/components/hub/ConciergePrompts";
import ConflictList from "@/components/hub/ConflictList";
import FocusChecklist from "@/components/hub/FocusChecklist";
import GuardrailLog from "@/components/hub/GuardrailLog";
import HeroCard from "@/components/hub/HeroCard";
import MetricsRow from "@/components/hub/MetricsRow";
import { useConciergeChat } from "@/hooks/useConciergeChat";
import { usePlan } from "@/hooks/usePlan";
import { computePlanMetrics } from "@/lib/client/plan-metrics";
import { DEMO_BRIEF } from "@/lib/demo/brief";

export default function HubPage() {
  const { budget, tasks, conflicts, nowMs, toggleTask } = usePlan(DEMO_BRIEF);
  const chat = useConciergeChat(DEMO_BRIEF);
  const [chatOpen, setChatOpen] = useState(false);
  const chatTriggerRef = useRef<HTMLElement | null>(null);
  const metrics = computePlanMetrics(tasks, DEMO_BRIEF.eventDate, nowMs);

  function openChat(prefill: string, trigger: HTMLElement): void {
    chatTriggerRef.current = trigger;
    chat.setInput(prefill);
    setChatOpen(true);
  }

  function closeChat(): void {
    setChatOpen(false);
    chatTriggerRef.current?.focus();
  }

  return (
    <main className="pt-20 px-margin max-w-md mx-auto flex flex-col gap-space-lg pb-36">
      <h1 className="sr-only">Planning hub for Priya &amp; Arjun&apos;s wedding</h1>

      <HeroCard
        daysToGo={metrics.daysToGo}
        readiness={metrics.readiness}
        budget={budget}
        conflicts={conflicts}
      />
      <MetricsRow
        budget={budget}
        guestCount={DEMO_BRIEF.guestCount}
        completedTasks={metrics.completedTasks}
        totalTasks={tasks.length}
        urgentCount={metrics.urgentCount}
      />
      <ConciergePrompts onSelect={openChat} />
      {budget && <BudgetBreakdown budget={budget} />}
      {metrics.sortedTasks.length > 0 && (
        <FocusChecklist tasks={metrics.sortedTasks} nowMs={nowMs} onToggle={toggleTask} />
      )}
      {conflicts.length > 0 && <ConflictList conflicts={conflicts} />}
      {chat.guardrailLog.length > 0 && <GuardrailLog entries={chat.guardrailLog} />}

      <ChatDialog
        open={chatOpen}
        onClose={closeChat}
        messages={chat.messages}
        input={chat.input}
        onInputChange={chat.setInput}
        onSubmit={() => void chat.submit()}
        loading={chat.loading}
        alert={chat.alert}
      />
    </main>
  );
}
