/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: { primary: "#0b0d12", secondary: "#11151c", card: "#161b24", hover: "#1e2532" },
        accent: { DEFAULT: "#d4a017", hover: "#b8890f", dim: "rgba(212,160,23,0.12)" },
        border: { DEFAULT: "rgba(255,255,255,0.07)", light: "rgba(255,255,255,0.14)" },
        text: { primary: "#f1f5f9", secondary: "#94a3b8", muted: "#64748b" },
        status: { ok: "#22c55e", warn: "#f59e0b", err: "#ef4444", info: "#60a5fa" },
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
