import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          slate: "#0B0F19",
          surface: "#111827",
          purple: "#8B5CF6",   // Violet Token
          cyan: "#06B6D4",     // Cyan Token
          blue: "#1D4ED8",
          text: "#F8FAFC",
          muted: "#94A3B8",
          danger: "#FB7185",
        },
        // Semantic Tokens from design-tokens.json
        semantic: {
          success: "#10b981",
          warning: "#f59e0b",
          danger: "#f43f5e",
        },
        surface: {
          background: "#020617", // Root Background
          glass: "rgba(255, 255, 255, 0.03)",
          glassHover: "rgba(255, 255, 255, 0.06)",
        }
      },
      fontFamily: {
        sans: ["Inter", "San Francisco", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      boxShadow: {
        glass: "0 0 0 1px rgba(255,255,255,0.08), 0 24px 80px rgba(2,6,23,0.45)",
        violet: "0 0 40px rgba(139,92,246,0.35)",
        cyan: "0 0 40px rgba(6,182,212,0.28)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, rgba(139,92,246,0.95), rgba(29,78,216,0.92))",
      },
    },
  },
  plugins: [],
} satisfies Config;
