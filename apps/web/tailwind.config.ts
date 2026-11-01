import type { Config } from "tailwindcss";

/* eslint-disable @typescript-eslint/no-require-imports */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const tokens = require("../../design/tailwind.tokens.js");

/**
 * The theme is NOT defined here. It is defined once in design/tailwind.tokens.js and
 * consumed by every surface (web, future native, exports). Do not add colours here.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: tokens.darkMode as Config["darkMode"],
  theme: tokens.theme as unknown as Config["theme"],
  plugins: [],
};

export default config;
