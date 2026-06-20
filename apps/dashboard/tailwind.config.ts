import type { Config } from "tailwindcss";

// Hoixi — neon dark carnival teması.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0b0712", // neredeyse siyah, mor tonlu
          soft: "#140d20",
          card: "#1a1029",
          hover: "#241636",
        },
        neon: {
          pink: "#ff2e97",
          purple: "#a64dff",
          gold: "#ffc83d",
          cyan: "#22e0ff",
        },
        accent: {
          DEFAULT: "#ff2e97", // neon magenta = ana vurgu
          hover: "#ff5cae",
          soft: "#2a1430",
        },
        border: "#33214d",
        // Nadirlik renkleri (item kartları)
        rare: {
          common: "#9b9b9b",
          uncommon: "#57f287",
          rare: "#3b82f6",
          epic: "#a855f7",
          legendary: "#ffc83d",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "cursive"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        neon: "0 0 12px rgba(255,46,151,0.45)",
        "neon-purple": "0 0 12px rgba(166,77,255,0.45)",
        "neon-gold": "0 0 14px rgba(255,200,61,0.5)",
        card: "0 0 0 1px rgba(255,46,151,0.08), 0 8px 30px rgba(0,0,0,0.5)",
      },
      backgroundImage: {
        "carnival-stripes":
          "repeating-linear-gradient(45deg, rgba(255,46,151,0.06) 0 14px, transparent 14px 28px)",
      },
    },
  },
  plugins: [],
};

export default config;
