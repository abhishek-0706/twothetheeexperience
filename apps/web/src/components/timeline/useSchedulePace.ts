import { useEffect, useState } from "react";
import type { RunOfShowItem } from "@/lib/core/types";
import { endMinute, minutesSinceMidnight } from "./time";

export type PaceTone = "unknown" | "onTime" | "behind";

export interface SchedulePace {
  label: string;
  tone: PaceTone;
}

export function computePace(
  activeItem: RunOfShowItem | undefined,
  nowMin: number | null
): SchedulePace {
  if (!activeItem || nowMin === null) return { label: "—", tone: "unknown" };
  const activeEnd = endMinute(activeItem);
  return nowMin <= activeEnd
    ? { label: "On Time", tone: "onTime" }
    : { label: `${nowMin - activeEnd}m Behind`, tone: "behind" };
}

export function useSchedulePace(activeItem: RunOfShowItem | undefined): SchedulePace {
  const [nowMin, setNowMin] = useState<number | null>(null);

  // Clock-dependent pace is computed after mount so server and client HTML match.
  useEffect(() => {
    setNowMin(minutesSinceMidnight(new Date()));
  }, []);

  return computePace(activeItem, nowMin);
}
