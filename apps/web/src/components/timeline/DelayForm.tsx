"use client";

import { useId } from "react";
import Icon from "@/components/ui/Icon";
import { MAX_DELAY_MIN, MIN_DELAY_MIN, type CascadeState } from "./useCascade";

interface DelayFormProps {
  cascade: CascadeState;
  disabled: boolean;
}

export default function DelayForm({ cascade, disabled }: DelayFormProps) {
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const { delayInput, delayError } = cascade;

  return (
    <form onSubmit={cascade.submit} noValidate className="mt-3 flex flex-wrap items-center gap-2">
      <button
        ref={cascade.recalcButtonRef}
        type="submit"
        disabled={disabled}
        className="min-h-[44px] px-3.5 py-1.5 rounded-full bg-primary text-surface font-label-md text-label-md font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform disabled:opacity-40"
      >
        Recalculate +{delayInput || 0}m
        <Icon name="bolt" className="text-[14px]" />
      </button>
      <div className="flex items-center gap-1">
        <label htmlFor={inputId} className="sr-only">
          Delay
        </label>
        <input
          id={inputId}
          type="number"
          inputMode="numeric"
          value={delayInput}
          onChange={(e) => cascade.setDelayInput(e.target.value)}
          min={MIN_DELAY_MIN}
          max={MAX_DELAY_MIN}
          step={1}
          aria-describedby={delayError ? `${hintId} ${errorId}` : hintId}
          aria-invalid={delayError ? true : undefined}
          className="w-16 min-h-[44px] px-2 rounded-full bg-surface-container-lowest text-primary font-label-md text-label-md text-center border border-outline focus:border-secondary"
        />
        <span id={hintId} className="text-label-sm text-on-surface-variant">
          minutes
          <span className="sr-only">
            {" "}
            (between {MIN_DELAY_MIN} and {MAX_DELAY_MIN})
          </span>
        </span>
      </div>
      {delayError && (
        <p id={errorId} role="alert" className="w-full text-label-sm text-error font-semibold">
          {delayError}
        </p>
      )}
    </form>
  );
}
