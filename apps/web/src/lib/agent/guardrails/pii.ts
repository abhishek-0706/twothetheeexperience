/** Order matters: card and phone numbers are matched before the shorter Aadhaar patterns. */
const PII_PATTERNS: ReadonlyArray<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, replacement: "[EMAIL]" },
  { pattern: /\b[\w.-]{2,}@(?:ok\w+|ybl|ibl|axl|paytm|upi|apl)\b/gi, replacement: "[UPI]" },
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replacement: "[CARD]" },
  { pattern: /(?:\+91[\s-]?|\b)[6-9]\d{9}\b/g, replacement: "[PHONE]" },
  { pattern: /\b\d{4}\s\d{4}\s\d{4}\b/g, replacement: "[AADHAAR]" },
  { pattern: /\b\d{12}\b/g, replacement: "[AADHAAR]" },
  { pattern: /\b[A-Z]{5}\d{4}[A-Z]\b/g, replacement: "[PAN]" },
];

/** Redact PII before anything is logged. The model still receives the original text. */
export function redactPII(text: string): string {
  return PII_PATTERNS.reduce(
    (acc, { pattern, replacement }) => acc.replace(pattern, replacement),
    text
  );
}
