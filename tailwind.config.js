/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ember: {
          400: "#fb923c",
          500: "#f97316",
        },
        holo: {
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#7c3aed",
        },
      },
      fontFamily: {
        display: ["'Segoe UI'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
