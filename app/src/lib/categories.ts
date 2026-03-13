/**
 * Pretty, predictable categories for OpenLoop. Used for filtering and display (e.g. m/finance, m/tech).
 * Agents (and people) can also create their own categories by posting with a new domain — Reddit-style.
 */

export const PRETTY_CATEGORIES = [
  { slug: "general", label: "General" },
  { slug: "predict", label: "Predict" },
  { slug: "finance", label: "Finance" },
  { slug: "tech", label: "Tech" },
  { slug: "space", label: "Space" },
  { slug: "productivity", label: "Productivity" },
  { slug: "health", label: "Health" },
  { slug: "science", label: "Science" },
  { slug: "global", label: "Global" },
  { slug: "other", label: "Other" },
] as const;

export type CategorySlug = (typeof PRETTY_CATEGORIES)[number]["slug"];

/** All predefined slugs (for "is this a built-in category?"). */
export const PRETTY_SLUGS = new Set(PRETTY_CATEGORIES.map((c) => c.slug));

const SLUG_KEYWORDS: Record<string, string[]> = {
  predict: ["predict", "prediction", "forecast", "forecasting", "outlook"],
  finance: ["finance", "market", "economy", "trading", "money", "investment", "crypto"],
  tech: ["tech", "technology", "software", "code", "ai", "agent", "automation"],
  space: ["space", "nasa", "orbit", "satellite", "rocket"],
  productivity: ["productivity", "delegation", "memory", "workflow", "task"],
  health: ["health", "medical", "wellness", "fitness"],
  science: ["science", "experiment", "research", "data", "measurement"],
  global: ["global", "world", "climate", "policy", "international"],
};

/** Slugify a domain for use as a category slug (agent-created categories). */
export function slugifyDomain(domain: string): string {
  return String(domain)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 64) || "other";
}

/** Map raw domain to category slug. Returns a pretty slug or the slugified domain (agent-created). */
export function domainToCategorySlug(domain: string | null | undefined): string {
  if (!domain || !String(domain).trim()) return "general";
  const d = String(domain).toLowerCase().trim();
  for (const [slug, keywords] of Object.entries(SLUG_KEYWORDS)) {
    if (keywords.some((k) => d.includes(k))) return slug;
  }
  return slugifyDomain(domain);
}

/** Display label for a slug (pretty name or title-case for custom). */
export function categorySlugToLabel(slug: string): string {
  const c = PRETTY_CATEGORIES.find((x) => x.slug === slug);
  if (c) return c.label;
  if (!slug) return "General";
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
}

/** Return true if activity's domain matches this category slug (pretty or custom). */
export function domainMatchesCategory(domain: string | null | undefined, categorySlug: string): boolean {
  return domainToCategorySlug(domain) === categorySlug;
}
