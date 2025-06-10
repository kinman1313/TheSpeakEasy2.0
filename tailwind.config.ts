import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "rgba(var(--foreground-rgb), 0.2)",
        input: "rgba(var(--secondary-rgb), 0.5)",
        ring: "rgb(var(--primary-rgb))",
        background: "rgb(var(--background-start-rgb))",
        foreground: "rgb(var(--foreground-rgb))",
        primary: {
          DEFAULT: "rgb(var(--primary-rgb))",
          foreground: "rgb(var(--primary-foreground-rgb))",
        },
        secondary: {
          DEFAULT: "rgb(var(--secondary-rgb))",
          foreground: "rgb(var(--secondary-foreground-rgb))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "rgba(var(--secondary-rgb), 0.5)",
          foreground: "rgba(var(--foreground-rgb), 0.7)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent-rgb))",
          foreground: "rgb(var(--accent-foreground-rgb))",
        },
        popover: {
          DEFAULT: "rgb(var(--secondary-rgb))",
          foreground: "rgb(var(--foreground-rgb))",
        },
        card: {
          DEFAULT: "rgba(var(--secondary-rgb), 0.5)",
          foreground: "rgb(var(--foreground-rgb))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config

