import type { Config } from "tailwindcss";

/**
 * twothetheeexperience design tokens — single source of truth.
 *
 * Extracted verbatim from the product-owner mockups, plus:
 *   [+] semantic tokens promoted from ad-hoc hex values used in the mockup markup
 *   [!] three foreground values darkened to clear WCAG 2.2 AA contrast
 *
 * Consumed by apps/web/tailwind.config.ts. No raw hex in component code.
 */

export const palette = {
  // --- Core surfaces (warm ivory ground, white cards) ---
  background: "#fbf9f6",
  surface: "#fbf9f6",
  "surface-bright": "#fbf9f6",
  "surface-dim": "#dbdad7",
  "surface-variant": "#e4e2df",
  "surface-tint": "#685a65",
  "surface-container-lowest": "#ffffff",
  "surface-container-low": "#f5f3f0",
  "surface-container": "#efeeeb",
  "surface-container-high": "#eae8e5",
  "surface-container-highest": "#e4e2df",
  "inverse-surface": "#30312f",
  "inverse-on-surface": "#f2f0ed",

  // --- Primary: near-black aubergine. All headings and body copy. ---
  primary: "#170d16",
  "on-primary": "#ffffff",
  "primary-container": "#2d222b",
  "on-primary-container": "#988893",
  "primary-fixed": "#f0ddea",
  "primary-fixed-dim": "#d4c1ce",
  "on-primary-fixed": "#231821",
  "on-primary-fixed-variant": "#50434d",
  "inverse-primary": "#d4c1ce",

  // --- Secondary: bronze/champagne. The AI accent. Use sparingly. ---
  secondary: "#775a19",
  "on-secondary": "#ffffff",
  "secondary-container": "#fed488",
  "on-secondary-container": "#785a1a",
  "secondary-fixed": "#ffdea5",
  "secondary-fixed-dim": "#e9c176",
  "on-secondary-fixed": "#261900",
  "on-secondary-fixed-variant": "#5d4201",

  // --- Tertiary: blush. Major milestones. ---
  tertiary: "#23080c",
  "on-tertiary": "#ffffff",
  "tertiary-container": "#3c1c20",
  "on-tertiary-container": "#af8185",
  "tertiary-fixed": "#ffdadc",
  "tertiary-fixed-dim": "#eeb9bd",
  "on-tertiary-fixed": "#301216",
  "on-tertiary-fixed-variant": "#623c40",

  // --- Text and lines ---
  "on-background": "#1b1c1a",
  "on-surface": "#1b1c1a",
  "on-surface-variant": "#4c4549",
  outline: "#6f686c", // [!] was #7d757a — 4.25:1 on surface, failed AA
  "outline-variant": "#cec4c9",

  // --- Error ---
  error: "#ba1a1a",
  "on-error": "#ffffff",
  "error-container": "#ffdad6",
  "on-error-container": "#93000a",

  // --- [+] Promoted from ad-hoc hex in the mockups ---
  // Success = on time / verified / under budget. The ONLY success colour.
  success: "#477856", // [!] was #4a7c59 — 4.39:1 on surface-container-low, failed AA
  "success-container": "#edf4ef",
  "on-success-container": "#3f6b4c", // [!] was #4a7c59 — 4.35:1 on container, failed AA

  // Accent = warm gold pill fills (status chips, print/milestone tags)
  "accent-container": "#faf4e7",
  "on-accent-container": "#85661f", // [!] was #8e6e26 — 4.35:1 on container, failed AA

  // Blush = secondary action chips
  "blush-container": "#fdf3f3",
  "on-blush-container": "#9c5b62",

  // Gold foil hairline — decorative borders only, never text
  "gold-foil": "#c5a059",
};

const tokens = {
  theme: {
    extend: {
      colors: palette,

      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem", // [+] hero and mood-strip cards
        full: "9999px",
      },

      spacing: {
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "1rem",
        "space-lg": "1.5rem",
        "space-xl": "2.5rem",
        margin: "1rem",
        "margin-tablet": "2rem",
        "margin-desktop": "3.5rem",
        gutter: "1.25rem",
        "gutter-desktop": "2rem",
      },

      fontFamily: {
        // Load via next/font, self-hosted. Do not use the Google Fonts <link>.
        display: ["var(--font-playfair)", "Playfair Display", "serif"],
        sans: ["var(--font-jakarta)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        "display-hero": ["var(--font-playfair)", "serif"],
        "display-hero-mobile": ["var(--font-playfair)", "serif"],
        "headline-lg": ["var(--font-playfair)", "serif"],
        "headline-lg-mobile": ["var(--font-playfair)", "serif"],
        "headline-md": ["var(--font-playfair)", "serif"],
        "headline-sm": ["var(--font-playfair)", "serif"],
        "title-md": ["var(--font-jakarta)", "sans-serif"],
        "body-lg": ["var(--font-jakarta)", "sans-serif"],
        "body-md": ["var(--font-jakarta)", "sans-serif"],
        "label-md": ["var(--font-jakarta)", "sans-serif"],
        "label-sm": ["var(--font-jakarta)", "sans-serif"],
      },

      fontSize: {
        "display-hero": [
          "56px",
          { lineHeight: "64px", letterSpacing: "-0.02em", fontWeight: "600" },
        ],
        "display-hero-mobile": [
          "38px",
          { lineHeight: "44px", letterSpacing: "-0.01em", fontWeight: "600" },
        ],
        "headline-lg": [
          "36px",
          { lineHeight: "44px", letterSpacing: "-0.015em", fontWeight: "600" },
        ],
        "headline-lg-mobile": [
          "28px",
          { lineHeight: "34px", letterSpacing: "-0.01em", fontWeight: "600" },
        ],
        "headline-md": ["24px", { lineHeight: "32px", letterSpacing: "0em", fontWeight: "500" }],
        "headline-sm": ["20px", { lineHeight: "28px", letterSpacing: "0em", fontWeight: "500" }],
        "title-md": ["16px", { lineHeight: "24px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "26px", letterSpacing: "0em", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "22px", letterSpacing: "0em", fontWeight: "400" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.04em", fontWeight: "600" }],
        // label-sm: eyebrows, timestamps and status pills ONLY — never actionable text.
        "label-sm": ["11px", { lineHeight: "14px", letterSpacing: "0.06em", fontWeight: "600" }],
      },

      boxShadow: {
        luxury: "0px 8px 24px -4px rgba(45, 34, 43, 0.04)",
      },

      borderColor: {
        luxury: "rgba(45, 34, 43, 0.06)",
      },

      backgroundImage: {
        // AI-initiated surfaces only. If it's champagne, the AI said it.
        champagne: "linear-gradient(135deg, rgba(254,212,136,0.25), rgba(245,241,235,0.8))",
        "ambient-glow":
          "radial-gradient(circle at top right, rgba(232,180,184,0.22), rgba(212,175,55,0.12) 60%, transparent 85%)",
      },
    },
  },
} satisfies Pick<Config, "theme">;

export default tokens;
