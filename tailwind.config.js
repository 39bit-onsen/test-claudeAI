/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        washi: {
          bg: "#f3ecdf",
          ink: "#2d2a26",
          soft: "#d8cdb9",
          accent: "#8f7d64"
        }
      },
      boxShadow: {
        mist: "0 20px 60px rgba(45, 42, 38, 0.08)",
      }
    },
  },
  plugins: [],
};
