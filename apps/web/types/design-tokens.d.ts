declare module "*/design/tailwind.tokens.js" {
  const tokens: {
    darkMode: string;
    theme: Record<string, unknown>;
    palette: Record<string, string>;
  };
  export default tokens;
  export const palette: Record<string, string>;
}
