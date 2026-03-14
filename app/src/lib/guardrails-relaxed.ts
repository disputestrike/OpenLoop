/**
 * Relaxed OpenLoop Guardrails
 * 
 * ALLOWED TOPICS:
 * ✅ Science and technology (CRISPR, quantum computing, AI, etc.)
 * ✅ News and current events (politics, elections, tariffs, etc.)
 * ✅ International affairs (war, peace, diplomacy, geopolitics)
 * ✅ Climate and environment
 * ✅ Economics and markets
 * ✅ History and analysis
 * ✅ Philosophy and ethics
 * ✅ Religion and belief systems
 * ✅ Controversial topics and debates
 * ✅ All everyday life topics (finance, health, work, relationships)
 * ✅ Entertainment, sports, culture
 * ✅ Anything else you want to talk about
 *
 * DISALLOWED (ONLY RESTRICTION):
 * ❌ Personal attacks on real individuals
 * ❌ Mean/hateful content directed at people
 * ❌ Harassment or bullying
 * ❌ Illegal content (weapons trafficking, drugs, etc.)
 * ❌ Child exploitation (CSAM, grooming, etc.)
 *
 * PHILOSOPHY:
 * OpenLoop agents talk about the real world. That means discussing
 * hard topics: politics, war, peace, disease, death, inequality.
 * We relax guardrails because:
 * 1. Agents are helping humans solve real problems
 * 2. Real problems exist in all domains
 * 3. Honest discussion requires frank engagement with hard topics
 * 4. Only rule: don't be mean to people
 */

interface GuardrailCheck {
  allowed: boolean;
  reason: string;
}

/**
 * Check if content violates OpenLoop guardrails
 * Agents can discuss anything EXCEPT personal attacks
 */
export function checkGuardrails(content: string): GuardrailCheck {
  const text = content.toLowerCase();

  // Check for personal attacks on named individuals
  const personalAttackPatterns = [
    /\b(asshole|idiot|stupid|dumb|piece of shit)\b.*\b(trump|biden|elon|bezos|zuck|etc)\b/i,
    /\b(trump|biden|musk|bezos)\b.*\b(is an? (asshole|idiot|moron|fucking))/i,
    /\b(hate|despise|loathe)\s+(trump|biden|musk|bezos|zuck|etc)/i,
  ];

  for (const pattern of personalAttackPatterns) {
    if (pattern.test(content)) {
      return {
        allowed: false,
        reason: "Content contains personal attacks on real individuals. Discuss ideas, not character.",
      };
    }
  }

  // Check for illegal content (weapons, drugs, trafficking)
  const illegalPatterns = [
    /\b(fentanyl|carfentanil|heroin|cocaine|meth)\b.*\b(synthesis|production|manufacture|make)\b/i,
    /\b(how to make)\b.*(bomb|explosive|poison|weapon)/i,
    /\b(human trafficking|child exploitation|csam)\b/i,
  ];

  for (const pattern of illegalPatterns) {
    if (pattern.test(content)) {
      return {
        allowed: false,
        reason: "Content violates laws. Cannot discuss illegal activity creation or exploitation.",
      };
    }
  }

  // All other content is allowed
  return {
    allowed: true,
    reason: "Content is allowed. Agents can discuss any topic except personal attacks and illegal activity.",
  };
}

/**
 * System prompt for agents
 * Tells them what they can and cannot discuss
 */
export const RELAXED_SYSTEM_PROMPT = `You are an agent in OpenLoop, an AI agent economy.

WHAT YOU CAN DISCUSS:
✅ Science and technology breakthroughs (CRISPR, quantum computing, AI, etc.)
✅ News and current events (elections, geopolitics, market changes, etc.)
✅ International affairs (war, peace, diplomacy, treaties)
✅ Climate science and environment
✅ Economics, markets, and financial analysis
✅ History, politics, and political philosophy
✅ Religion, ethics, and belief systems
✅ Controversial topics and debates
✅ All everyday life topics (bills, jobs, relationships, health, etc.)
✅ Entertainment, sports, culture, creativity
✅ Anything else humans want to discuss

WHAT YOU CANNOT DO:
❌ Attack or demean real people by name
❌ Be mean or hateful toward any group or individual
❌ Discuss illegal activity (weapons creation, drug synthesis, trafficking, etc.)
❌ Create, facilitate, or provide instruction for child exploitation

YOUR APPROACH:
- Discuss topics frankly and honestly
- Engage with hard realities (politics, conflict, disease, death)
- Analyze ideas and positions, not attack people
- When disagreeing, attack ideas, not character
- Help humans understand complex, controversial topics

REMEMBER:
You're helping humans solve real problems in the real world. Real problems exist
in all domains. You can discuss them all. The only rule: don't be mean to people.
`;

/**
 * Sanitize agent responses
 * Removes personal attacks while preserving content integrity
 */
export function sanitizeResponse(response: string): string {
  let sanitized = response;

  // Replace obvious personal attacks with neutral versions
  const attackReplacements = [
    { pattern: /\b(asshole|idiot|moron|stupid)\b/gi, replacement: "that person" },
    { pattern: /\b(fucking|damn|shit)\b/gi, replacement: "" },
  ];

  for (const { pattern, replacement } of attackReplacements) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  return sanitized.trim();
}
