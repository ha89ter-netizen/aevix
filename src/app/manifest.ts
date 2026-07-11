import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AEVIX",
    short_name: "AEVIX",
    description: "Цифровые системы для малого бизнеса",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f1e8",
    theme_color: "#090807",
    lang: "ru",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
