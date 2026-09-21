import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        // od téhle šířky se detail verze dělí na dokument a boční panel
        doc: "820px",
        // od téhle šířky se vedle dokumentu vejde i formulář (obrazovka nahrávání)
        wide: "1100px",
      },
      colors: {
        // barvy podle vizuálního stylu AI dětem
        coral: "#DC5B5B", // primární akcentová barva
        mist: "#B3CDD6", // sekundární
        haze: "#DAE7EC", // světlé pozadí / karty
        ink: "#070707", // tmavý text
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        heading: ["Darker Grotesque", "system-ui", "sans-serif"],
      },
      borderRadius: {
        pill: "999px",
      },
    },
  },
  plugins: [],
};

export default config;
