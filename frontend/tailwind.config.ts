import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#e6f7fd",
          100: "#c0eaf9",
          200: "#83d7f4",
          300: "#40c2ed",
          400: "#10b0e8",
          500: "#00AEEF",
          600: "#0096d0",
          700: "#007BAA",
          800: "#005B8E",
          900: "#003F65",
          950: "#002844",
        },
        forest: {
          50:  "#eaf7ea",
          100: "#c2e9c0",
          200: "#93d890",
          400: "#3dba38",
          500: "#3AAA35",
          600: "#2d8a29",
          700: "#1f6a1c",
        },
      },
    },
  },
  plugins: [],
};
export default config;
