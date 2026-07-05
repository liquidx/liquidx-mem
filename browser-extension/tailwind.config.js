/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Terminal / HUD design tokens (docs/design/README.md)
        base: "#08080A",
        surface: "#0C0C10",
        canvas: "#0A0A0D",
        accent: {
          DEFAULT: "#A78BFA",
          muted: "#7C6BB0",
        },
        track: "#3A3A44",
        ink: {
          primary: "#E6E6EA",
          secondary: "#9A9AA4",
          tertiary: "#7A7A84",
          quaternary: "#6A6A74",
          faint: "#54545E",
        },
        warn: "#D0A24C",
        danger: "#D06A6A",
        // hairlines
        hair: {
          faint: "rgba(255,255,255,0.05)",
          DEFAULT: "rgba(255,255,255,0.09)",
          strong: "rgba(255,255,255,0.14)",
        },
      },
      fontFamily: {
        mono: [
          '"Spline Sans Mono"',
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      borderRadius: {
        // No rounded corners anywhere.
        none: "0",
      },
    },
  },
  plugins: [],
}
