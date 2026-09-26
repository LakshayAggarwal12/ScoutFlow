/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14181f",
        slate: {
          925: "#0f1218",
        },
        accent: "#2f6fed",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      transitionDuration: {
        DEFAULT: "180ms",
      },
      keyframes: {
        "slide-in": { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
        "fade-in": { from: { opacity: 0 }, to: { opacity: 1 } },
        "toast-in": { from: { opacity: 0, transform: "translateY(-8px)" }, to: { opacity: 1, transform: "translateY(0)" } },
      },
      animation: {
        "slide-in": "slide-in 220ms ease-out",
        "fade-in": "fade-in 180ms ease-out",
        "toast-in": "toast-in 200ms ease-out",
      },
    },
  },
  plugins: [],
};
