/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Open Sans'", "system-ui", "-apple-system", "sans-serif"],
        heading: ["'Open Sans'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
}


