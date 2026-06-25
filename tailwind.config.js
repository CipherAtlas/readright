/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#10100e",
        paper: "#f4efe3",
        chalk: "#fffaf0",
        oxidized: "#4c7d72",
        signal: "#d34f32",
        violetInk: "#2d2440",
      },
      boxShadow: {
        glow: "0 28px 90px rgba(16, 16, 14, 0.24)",
      },
    },
  },
  plugins: [],
};
