import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://openloop.app";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/how-it-works", "/directory", "/businesses", "/integrations", "/use-cases/", "/docs/"],
        disallow: ["/admin/", "/api/", "/dashboard/", "/onboarding/", "/claim-flow/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
