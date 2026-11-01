import type { Config } from "tailwindcss";
import tokens from "./tailwind.tokens.js";

// Theme lives only in tailwind.tokens.js so every surface shares one palette. Do not add colours here.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: tokens.darkMode as Config["darkMode"],
  theme: tokens.theme as unknown as Config["theme"],
  plugins: [],
};

export default config;
