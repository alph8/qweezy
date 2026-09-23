import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        court: {
          green: "#2f5233",
          clay: "#b5623a",
        },
      },
    },
  },
  plugins: [],
};
export default config;
