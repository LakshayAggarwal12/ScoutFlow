/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Neutral "ink" ramp - the core text/surface scale of the product.
        ink: {
          DEFAULT: "#14181f",
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#d6dae3",
          300: "#b1b8c7",
          400: "#858ea4",
          500: "#676f83",
          600: "#525869",
          700: "#434857",
          800: "#2b2f3b",
          900: "#1b1f28",
          925: "#0f1218",
          950: "#0a0d12",
        },
        // Brand accent ramp (kept at DEFAULT #2f6fed for existing usages).
        accent: {
          DEFAULT: "#2f6fed",
          50: "#eff5ff",
          100: "#dbe8fe",
          200: "#bfd6fe",
          300: "#93bbfd",
          400: "#6198f9",
          500: "#3d7bf3",
          600: "#2f6fed",
          700: "#2456d8",
          800: "#2246ae",
          900: "#213e89",
          950: "#182a53",
        },
        slate: {
          925: "#0f1218",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 18 24 / 0.04), 0 1px 3px 0 rgb(15 18 24 / 0.06)",
        lifted: "0 10px 30px -14px rgb(15 18 24 / 0.25), 0 2px 6px -2px rgb(15 18 24 / 0.06)",
        pop: "0 24px 60px -20px rgb(15 18 24 / 0.45)",
      },
      transitionDuration: {
        DEFAULT: "180ms",
      },
      keyframes: {
        "slide-in": { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
        "fade-in": { from: { opacity: 0 }, to: { opacity: 1 } },
        "toast-in": { from: { opacity: 0, transform: "translateY(-8px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        "slide-up": { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        "scale-in": { from: { opacity: 0, transform: "scale(0.97)" }, to: { opacity: 1, transform: "scale(1)" } },
        shimmer: { "0%": { transform: "translateX(-100%)" }, "100%": { transform: "translateX(100%)" } },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "70%": { transform: "scale(1.6)", opacity: "0" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
      },
      animation: {
        "slide-in": "slide-in 220ms ease-out",
        "fade-in": "fade-in 180ms ease-out",
        "toast-in": "toast-in 200ms ease-out",
        "slide-up": "slide-up 220ms ease-out",
        "scale-in": "scale-in 160ms ease-out",
        shimmer: "shimmer 1.8s ease-in-out infinite",
        "pulse-ring": "pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

