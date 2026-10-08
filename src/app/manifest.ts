import type { MetadataRoute } from "next";

// Lets people "Add to Home Screen" and get an app-style icon and full-screen launch.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Qweezy",
    short_name: "Qweezy",
    description: "Club tennis doubles predictions. Points only.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#2f5233",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
