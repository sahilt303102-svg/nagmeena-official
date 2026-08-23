import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#FAF8F5",
        emerald: {
          DEFAULT: "#2A453F",
          deep: "#1C302B",
        },
        olive: "#4B5947",
        gold: {
          DEFAULT: "#9E7719",
          bright: "#B98A22",
        },
        sand: "#CFA158",
      },
      fontFamily: {
        display: ["var(--font-cinzel)", "serif"],
        heading: ["var(--font-marcellus)", "serif"],
        body: ["var(--font-jost)", "sans-serif"],
      },
      boxShadow: {
        glass: "0 18px 40px -12px rgba(42,69,63,0.18)",
        gold: "0 14px 30px -8px rgba(158,119,25,0.35)",
      },
      backdropBlur: {
        xs: "2px",
      },
      borderRadius: {
        card: "22px",
      },
    },
  },
  plugins: [],
};
export default config;
