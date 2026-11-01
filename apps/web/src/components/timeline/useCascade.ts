import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import type { CascadeResult, RunOfShowItem } from "@/lib/core/types";

export const MIN_DELAY_MIN = 1;
export const MAX_DELAY_MIN = 120;
const DEFAULT_DELAY_INPUT = "15";
const CANCEL_MESSAGE = "Preview cancelled. Schedule unchanged.";
const DELAY_ERROR = `Enter a whole number of minutes between ${MIN_DELAY_MIN} and ${MAX_DELAY_MIN}.`;

interface UseCascadeOptions {
  items: RunOfShowItem[];
  activeItem: RunOfShowItem | undefined;
  onApply: (items: RunOfShowItem[]) => void;
}

export interface CascadeState {
  delayInput: string;
  setDelayInput: (value: string) => void;
  delayError: string;
  result: CascadeResult | null;
  announcement: string;
  recalcButtonRef: RefObject<HTMLButtonElement | null>;
  previewHeadingRef: RefObject<HTMLHeadingElement | null>;
  submit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  apply: () => void;
  cancel: () => void;
}

function parseDelay(input: string): number | null {
  const delay = Number(input);
  return Number.isInteger(delay) && delay >= MIN_DELAY_MIN && delay <= MAX_DELAY_MIN ? delay : null;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function describePreview(result: CascadeResult): string {
  const violations = result.violations.length;
  return (
    `Preview ready: ${plural(result.shifted.length, "item")} would move, ` +
    (violations > 0 ? `${plural(violations, "pinned-time violation")}.` : "no violations.")
  );
}

/** Delay-cascade preview flow: validate input, preview the shift, then apply or cancel. */
export function useCascade({ items, activeItem, onApply }: UseCascadeOptions): CascadeState {
  const [delayInput, setDelayInput] = useState(DEFAULT_DELAY_INPUT);
  const [delayError, setDelayError] = useState("");
  const [result, setResult] = useState<CascadeResult | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const recalcButtonRef = useRef<HTMLButtonElement>(null);
  const previewHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (result) previewHeadingRef.current?.focus();
  }, [result]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeItem) return;
    const delayMin = parseDelay(delayInput);
    setDelayError(delayMin === null ? DELAY_ERROR : "");
    if (delayMin === null) return;
    const { cascadeDelay } = await import("@/lib/core/cascade");
    const preview = cascadeDelay(items, activeItem.id, delayMin);
    setResult(preview);
    setAnnouncement(describePreview(preview));
  }

  function close(message: string) {
    setResult(null);
    setAnnouncement(message);
    recalcButtonRef.current?.focus();
  }

  function apply() {
    if (!result) return;
    onApply(result.items);
    close(`Schedule updated. ${result.shifted.length} items moved.`);
  }

  return {
    delayInput,
    setDelayInput,
    delayError,
    result,
    announcement,
    recalcButtonRef,
    previewHeadingRef,
    submit,
    apply,
    cancel: () => close(CANCEL_MESSAGE),
  };
}
