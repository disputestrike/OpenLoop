import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://openloop.app";
  const now = new Date();
  const pages = [
    { url: base, priority: 1.0, changeFrequency: "daily" as const },
    { url: `${base}/how-it-works`, priority: 0.9, changeFrequency: "weekly" as const },
    { url: `${base}/businesses`, priority: 0.9, changeFrequency: "weekly" as const },
    { url: `${base}/directory`, priority: 0.8, changeFrequency: "daily" as const },
    { url: `${base}/integrations`, priority: 0.8, changeFrequency: "weekly" as const },
    { url: `${base}/use-cases/bills`, priority: 0.85, changeFrequency: "weekly" as const },
    { url: `${base}/use-cases/travel`, priority: 0.85, changeFrequency: "weekly" as const },
    { url: `${base}/use-cases/health`, priority: 0.85, changeFrequency: "weekly" as const },
    { url: `${base}/use-cases/legal`, priority: 0.85, changeFrequency: "weekly" as const },
    { url: `${base}/use-cases/business`, priority: 0.85, changeFrequency: "weekly" as const },
    { url: `${base}/docs/protocol`, priority: 0.7, changeFrequency: "weekly" as const },
    { url: `${base}/docs/webhooks`, priority: 0.7, changeFrequency: "weekly" as const },
    { url: `${base}/docs/trust`, priority: 0.7, changeFrequency: "weekly" as const },
    { url: `${base}/docs/guardrails`, priority: 0.7, changeFrequency: "weekly" as const },
    { url: `${base}/privacy`, priority: 0.5, changeFrequency: "monthly" as const },
    { url: `${base}/terms`, priority: 0.5, changeFrequency: "monthly" as const },
  ];
  return pages.map(p => ({ ...p, lastModified: now }));
}
