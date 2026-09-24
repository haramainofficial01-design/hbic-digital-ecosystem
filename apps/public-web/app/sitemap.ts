import type { MetadataRoute } from "next";

const routes = [
  "",
  "/app",
  "/about",
  "/community",
  "/contact",
  "/donate",
  "/events",
  "/halal-restaurants",
  "/media",
  "/prayer-times",
  "/privacy",
  "/programs",
  "/youth"
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return routes.map((path) => ({
    url: `https://hbic.ca${path}`,
    lastModified,
    changeFrequency: path === "" || path === "/prayer-times" ? "daily" : "weekly",
    priority: path === "" ? 1 : path === "/prayer-times" ? 0.9 : 0.7
  }));
}
