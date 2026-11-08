import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand: navy ground, green signal, gold accent.
        navy: {
          50: "#eef2f7",
          100: "#d6e0ec",
          200: "#aec1d8",
          300: "#7e9bbf",
          400: "#4f74a1",
          500: "#2f5280",
          600: "#1f3b61",
          700: "#152a46",
          800: "#0d1b2f",
          900: "#070e1a",
          950: "#04080f",
        },
        money: {
          DEFAULT: "#2BD47D",
          dark: "#0F7A4A",
          light: "#7BE8B0",
        },
        gold: {
          DEFAULT: "#F2B632",
          dark: "#B4821A",
        },
        // Status chips
        status: {
          idea: "#8A94A6",
          draft: "#F2B632",
          approved: "#3B82F6",
          scheduled: "#3B82F6",
          publishing: "#8B5CF6",
          published: "#2BD47D",
          failed: "#EF4444",
          rejected: "#6B7280",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      boxShadow: {
        panel: "0 20px 60px -20px rgba(4, 8, 15, 0.45)",
      },
      keyframes: {
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      animation: {
        "slide-in-right": "slide-in-right 180ms ease-out",
        "slide-up": "slide-up 200ms ease-out",
        "fade-in": "fade-in 140ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
