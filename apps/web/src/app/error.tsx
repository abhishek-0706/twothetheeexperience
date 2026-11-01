"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  useEffect(() => {
    logger.error("Unhandled render error", { digest: error.digest, message: error.message });
  }, [error]);

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold text-on-surface mb-2">Something went wrong</h1>
      <p className="text-on-surface-variant mb-6 max-w-md">
        An unexpected error occurred. Please try again or refresh the page.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90"
      >
        Try again
      </button>
    </main>
  );
}
