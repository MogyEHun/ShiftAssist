import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#1a5c3a",
          hover: "#154d30",
          light: "#f0f7f3",
        },
        secondary: {
          DEFAULT: "#d4a017",
          hover: "#b8891a",
          light: "#fdf8ec",
        },
        success: {
          DEFAULT: "#16a34a",
          light: "#f0fdf4",
        },
        danger: {
          DEFAULT: "#dc2626",
          light: "#fef2f2",
        },
        warning: {
          DEFAULT: "#d97706",
          light: "#fffbeb",
        },
      },
    },
  },
  plugins: [],
};
export default config;
