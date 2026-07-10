import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        milk: "#f7f1e8",
        porcelain: "#fffaf2",
        graphite: "#22201e",
        ink: "#090807",
        glass: "rgba(255, 250, 242, 0.68)",
        violet: "#7a5cff",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        object: "0 22px 70px rgba(9, 8, 7, 0.12)",
        glow: "0 0 46px rgba(122, 92, 255, 0.18)",
      },
      backgroundImage: {
        "fine-noise":
          "radial-gradient(circle at 1px 1px, rgba(9,8,7,0.08) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
};

export default config;
