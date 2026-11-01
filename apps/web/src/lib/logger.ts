type LogLevel = "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

interface Logger {
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
}

// Single-line JSON so Vercel's log drain can parse and filter entries by level.
function log(level: LogLevel, message: string, context?: LogContext): void {
  const line = JSON.stringify({ level, message, ...context, timestamp: new Date().toISOString() });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  // eslint-disable-next-line no-console -- info is the only level without a dedicated console method
  else console.info(line);
}

export const logger: Logger = {
  info: (message, context) => log("info", message, context),
  warn: (message, context) => log("warn", message, context),
  error: (message, context) => log("error", message, context),
};
