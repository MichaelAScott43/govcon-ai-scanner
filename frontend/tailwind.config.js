/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"]
      },
      colors: {
        navy: {
          50:  "#f0f4ff",
          100: "#e0e9ff",
          200: "#c2d3ff",
          300: "#95b3ff",
          400: "#5b87ff",
          500: "#2d5fe0",
          600: "#1a45c4",
          700: "#1534a0",
          800: "#162d82",
          900: "#0f1f5c",
          950: "#0a1340"
        },
        brand: {
          50:  "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          900: "#1e3a8a"
        },
        gold: {
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706"
        }
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0,0,0,.06), 0 1px 2px -1px rgba(0,0,0,.06)",
        "card-hover": "0 4px 16px -2px rgba(0,0,0,.10), 0 2px 6px -2px rgba(0,0,0,.06)",
        "nav": "0 1px 0 0 rgba(255,255,255,.06)"
      },
      backgroundImage: {
        "hero-gradient": "linear-gradient(135deg, #0f1f5c 0%, #1534a0 50%, #162d82 100%)",
        "card-gradient": "linear-gradient(135deg, #f8faff 0%, #ffffff 100%)"
      }
    }
  },
  plugins: []
};
