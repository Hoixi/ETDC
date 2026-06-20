import type { Config } from "tailwindcss";

// Hoixi koyu tema — koyu zemin, vurgu rengi.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0e0f13",
          soft: "#16181d",
          card: "#1b1e25",
          hover: "#22262f",
        },
        accent: {
          DEFAULT: "#7c5cff",
          hover: "#6b4cf0",
          soft: "#2a2545",
        },
        border: "#2a2e37",
      },
    },
  },
  plugins: [],
};

export default config;
