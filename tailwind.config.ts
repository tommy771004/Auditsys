import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          slate: "var(--bg-alt)",
          surface: "var(--surface)",
          purple: "var(--violet)",   
          cyan: "var(--teal)",     
          green: "var(--green)",    
          blue: "var(--blue)",
          text: "var(--text)",
          muted: "var(--muted)",
          danger: "var(--red)",
          amber: "var(--amber)",
        },
        semantic: {
          success: "var(--green)",
          warning: "var(--amber)",
          danger: "var(--red)",
        },
        surface: {
          background: "var(--bg)", 
          glass: "rgba(255, 255, 255, 0.03)",
          glassHover: "rgba(255, 255, 255, 0.06)",
        }
      },
      fontFamily: {
        sans: ["var(--fz)", "system-ui", "sans-serif"],
        mono: ["var(--fm)", "monospace"],
        grotesk: ["var(--fe)", "sans-serif"],
      },
      boxShadow: {
        glass: "0 0 0 1px rgba(255,255,255,0.08), 0 24px 80px rgba(2,6,23,0.45)",
        violet: "0 0 40px rgba(157,139,255,0.35)",
        cyan: "0 0 40px rgba(58,214,195,0.28)",
      },
      backgroundImage: {
        "brand-gradient": "var(--grad)",
      },
      keyframes: {
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        marquee: "marquee 40s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
