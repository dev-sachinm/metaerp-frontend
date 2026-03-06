/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand Colors - Slate + Indigo Theme
        border: "hsl(214.3 31.8% 91.4%)",
        input: "hsl(214.3 31.8% 91.4%)",
        ring: "hsl(243 75% 59%)", // Indigo
        background: "hsl(0 0% 100%)",
        foreground: "hsl(222.2 84% 4.9%)",
        primary: {
          DEFAULT: "hsl(243 75% 59%)", // Indigo 600
          foreground: "hsl(0 0% 100%)",
          50: "hsl(244 100% 97%)",
          100: "hsl(243 100% 96%)",
          200: "hsl(242 96% 90%)",
          300: "hsl(243 94% 82%)",
          400: "hsl(243 89% 70%)",
          500: "hsl(243 75% 59%)",
          600: "hsl(243 75% 59%)", // Main
          700: "hsl(243 58% 51%)",
          800: "hsl(243 54% 41%)",
          900: "hsl(244 47% 35%)",
        },
        secondary: {
          DEFAULT: "hsl(199 89% 48%)", // Sky 500
          foreground: "hsl(0 0% 100%)",
          50: "hsl(204 100% 97%)",
          100: "hsl(204 94% 94%)",
          200: "hsl(201 94% 86%)",
          300: "hsl(199 95% 74%)",
          400: "hsl(198 93% 60%)",
          500: "hsl(199 89% 48%)", // Main
          600: "hsl(200 98% 39%)",
          700: "hsl(201 96% 32%)",
          800: "hsl(201 90% 27%)",
          900: "hsl(202 80% 24%)",
        },
        accent: {
          DEFAULT: "hsl(258 90% 66%)", // Violet 500
          foreground: "hsl(0 0% 100%)",
          50: "hsl(270 100% 98%)",
          100: "hsl(269 100% 95%)",
          200: "hsl(269 100% 92%)",
          300: "hsl(269 97% 85%)",
          400: "hsl(270 95% 75%)",
          500: "hsl(258 90% 66%)", // Main
          600: "hsl(262 83% 58%)",
          700: "hsl(263 70% 50%)",
          800: "hsl(263 69% 42%)",
          900: "hsl(264 67% 35%)",
        },
        // Status Colors
        success: {
          DEFAULT: "hsl(160 84% 39%)", // Emerald 600
          foreground: "hsl(0 0% 100%)",
          50: "hsl(152 81% 96%)",
          500: "hsl(160 84% 39%)",
          600: "hsl(160 84% 39%)",
          700: "hsl(161 94% 30%)",
        },
        warning: {
          DEFAULT: "hsl(38 92% 50%)", // Amber 500
          foreground: "hsl(0 0% 100%)",
          50: "hsl(48 100% 96%)",
          500: "hsl(38 92% 50%)",
          600: "hsl(32 95% 44%)",
        },
        destructive: {
          DEFAULT: "hsl(0 84% 60%)", // Red 500
          foreground: "hsl(0 0% 100%)",
          50: "hsl(0 86% 97%)",
          500: "hsl(0 84% 60%)",
          600: "hsl(0 72% 51%)",
        },
        // Neutral Scale (Slate)
        muted: {
          DEFAULT: "hsl(210 40% 96.1%)",
          foreground: "hsl(215.4 16.3% 46.9%)",
        },
        card: {
          DEFAULT: "hsl(0 0% 100%)",
          foreground: "hsl(222.2 84% 4.9%)",
        },
        popover: {
          DEFAULT: "hsl(0 0% 100%)",
          foreground: "hsl(222.2 84% 4.9%)",
        },
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Oxygen",
          "Ubuntu",
          "Cantarell",
          "sans-serif",
        ],
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
}
