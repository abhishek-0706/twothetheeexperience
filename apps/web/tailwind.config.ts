import type { Config } from "tailwindcss";
import tokens from "./tailwind.tokens";

// The theme lives only in tailwind.tokens.ts so every surface shares one palette.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: tokens.theme,
  plugins: [],
};

export default config;
