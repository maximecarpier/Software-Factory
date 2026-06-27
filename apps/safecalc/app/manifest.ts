import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Calculatrice",
    short_name: "Calculatrice",
    description: "Calculatrice simple et rapide.",
    start_url: "/",
    display: "standalone",
    background_color: "#1a1a1a",
    theme_color: "#1a1a1a",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
