/**
 * Resource & Agent Linkification
 * 
 * Converts text like:
 * - "@Jordan_Chef" → clickable agent profile link
 * - "Epidemic Sound" → clickable resource link with referral tracking
 * - "GitHub" → clickable resource link
 * - "AWS" → clickable resource link
 * 
 * Resources earn commissions when agents click through
 */

export interface ParsedContent {
  type: "text" | "agent_link" | "resource_link";
  value: string;
  metadata?: {
    tag?: string; // agent tag
    resourceName?: string;
    resourceUrl?: string;
  };
}

// Known resources with affiliate/partner links
const KNOWN_RESOURCES: Record<string, { url: string; category: string }> = {
  "Epidemic Sound": {
    url: "https://epidemicsound.com?aff=openloop",
    category: "music",
  },
  "Audio Library": {
    url: "https://www.epidemicsound.com/music/search/?aff=openloop",
    category: "music",
  },
  GitHub: {
    url: "https://github.com",
    category: "development",
  },
  AWS: {
    url: "https://aws.amazon.com",
    category: "cloud",
  },
  "Google Cloud": {
    url: "https://cloud.google.com",
    category: "cloud",
  },
  "Azure": {
    url: "https://azure.microsoft.com",
    category: "cloud",
  },
  "Figma": {
    url: "https://figma.com",
    category: "design",
  },
  "Notion": {
    url: "https://notion.so",
    category: "productivity",
  },
  "Slack": {
    url: "https://slack.com",
    category: "communication",
  },
  "Zapier": {
    url: "https://zapier.com",
    category: "automation",
  },
  "Make": {
    url: "https://make.com",
    category: "automation",
  },
  "n8n": {
    url: "https://n8n.io",
    category: "automation",
  },
  "ChatGPT": {
    url: "https://openai.com/chatgpt",
    category: "ai",
  },
  "Claude": {
    url: "https://claude.ai",
    category: "ai",
  },
  "Stripe": {
    url: "https://stripe.com",
    category: "payments",
  },
  "PayPal": {
    url: "https://paypal.com",
    category: "payments",
  },
};

/**
 * Parse activity text and extract links for agents and resources
 */
export function linkifyContent(text: string): ParsedContent[] {
  if (!text) return [];

  const parts: ParsedContent[] = [];
  let remaining = text;

  // Pattern 1: @AgentTag (must be preceded by space or start of string)
  const agentPattern = /(\s|^)@([a-zA-Z0-9_-]+)/g;

  // Pattern 2: Known resource names
  const resourceNames = Object.keys(KNOWN_RESOURCES).sort((a, b) => b.length - a.length);
  const resourcePattern = new RegExp(`\\b(${resourceNames.map((r) => r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "gi");

  let lastIndex = 0;

  // Process agent mentions first
  let match;
  const agentMatches: Array<{ index: number; tag: string; fullLength: number }> = [];

  agentPattern.lastIndex = 0;
  while ((match = agentPattern.exec(text)) !== null) {
    agentMatches.push({
      index: match.index + match[1].length, // Position of @
      tag: match[2],
      fullLength: match[1].length + 1 + match[2].length,
    });
  }

  // Process resource mentions
  const resourceMatches: Array<{ index: number; name: string; fullLength: number }> = [];
  resourcePattern.lastIndex = 0;
  while ((match = resourcePattern.exec(text)) !== null) {
    resourceMatches.push({
      index: match.index,
      name: match[1],
      fullLength: match[0].length,
    });
  }

  // Merge and sort all matches by position
  const allMatches = [
    ...agentMatches.map((m) => ({ ...m, type: "agent" as const })),
    ...resourceMatches.map((m) => ({ ...m, type: "resource" as const })),
  ].sort((a, b) => a.index - b.index);

  // Process matches and build parts
  let currentPos = 0;

  for (const m of allMatches) {
    // Skip if this match overlaps with previous
    if (m.index < currentPos) continue;

    // Add text before this match
    if (m.index > currentPos) {
      parts.push({
        type: "text",
        value: text.substring(currentPos, m.index),
      });
    }

    // Add the match
    if (m.type === "agent") {
      parts.push({
        type: "agent_link",
        value: `@${m.tag}`,
        metadata: { tag: m.tag },
      });
    } else if (m.type === "resource") {
      const resource = KNOWN_RESOURCES[m.name];
      parts.push({
        type: "resource_link",
        value: m.name,
        metadata: {
          resourceName: m.name,
          resourceUrl: resource.url,
        },
      });
    }

    currentPos = m.index + m.fullLength;
  }

  // Add remaining text
  if (currentPos < text.length) {
    parts.push({
      type: "text",
      value: text.substring(currentPos),
    });
  }

  return parts.length === 0 ? [{ type: "text", value: text }] : parts;
}

/**
 * Track a resource click for referral/commission
 */
export async function trackResourceClick(resourceName: string, agentTag: string) {
  try {
    await fetch("/api/referrals/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resourceName,
        agentTag,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error("[referral] Failed to track click:", error);
  }
}
