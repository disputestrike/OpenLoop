/**
 * Seed the marketplace with reference agents (Flight, Bill, Research, Meeting).
 * These appear in capability discovery and give early users something useful.
 * Run: node scripts/seed-marketplace-agents.js (from app dir, with DATABASE_URL set)
 */

const { Pool } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local"), override: true });

const REFERENCE_AGENTS = [
  {
    loop_tag: "FlightSearch",
    agent_core_domains: ["flight_search", "travel", "booking"],
    agent_signature_skills: ["flight_search", "travel_booking", "price_comparison"],
    role: "agent",
    persona: "buyer",
    public_description: "Reference agent: flight search and travel booking. Register your own agent with capability flight_search to join the network.",
  },
  {
    loop_tag: "BillNegotiator",
    agent_core_domains: ["bill_negotiation", "bills", "savings"],
    agent_signature_skills: ["bill_negotiation", "cable", "utilities", "insurance"],
    role: "agent",
    persona: "buyer",
    public_description: "Reference agent: bill negotiation and savings. Register with capability bill_negotiation to receive tasks.",
  },
  {
    loop_tag: "MarketResearch",
    agent_core_domains: ["market_research", "research", "data"],
    agent_signature_skills: ["market_research", "competitive_analysis", "reports"],
    role: "agent",
    persona: "general",
    public_description: "Reference agent: market research and analysis. Use capability market_research for discovery.",
  },
  {
    loop_tag: "MeetingScheduler",
    agent_core_domains: ["meeting_scheduling", "calendar", "scheduling"],
    agent_signature_skills: ["meeting_scheduling", "appointment_booking", "calendar"],
    role: "agent",
    persona: "general",
    public_description: "Reference agent: meeting and appointment scheduling. Register with meeting_scheduling to get tasks.",
  },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  if (!process.env.DATABASE_URL) {
    console.error("Set DATABASE_URL");
    process.exit(1);
  }

  for (const agent of REFERENCE_AGENTS) {
    try {
      const res = await pool.query(
        `UPDATE loops SET agent_core_domains = $1, agent_signature_skills = $2, role = $3, persona = $4, public_description = $5, updated_at = now()
         WHERE lower(loop_tag) = lower($6)
         RETURNING id, loop_tag`,
        [
          agent.agent_core_domains,
          agent.agent_signature_skills,
          agent.role,
          agent.persona,
          agent.public_description || null,
          agent.loop_tag,
        ]
      );
      if (res.rowCount > 0) {
        console.log("Updated:", agent.loop_tag);
      } else {
        await pool.query(
          `INSERT INTO loops (loop_tag, status, role, persona, agent_core_domains, agent_signature_skills, public_description, trust_score)
           VALUES ($1, 'unclaimed', 'both', $2, $3, $4, $5, 50)
           ON CONFLICT (loop_tag) DO UPDATE SET agent_core_domains = EXCLUDED.agent_core_domains, agent_signature_skills = EXCLUDED.agent_signature_skills, public_description = EXCLUDED.public_description, updated_at = now()`,
          [agent.loop_tag, agent.persona, agent.agent_core_domains, agent.agent_signature_skills, agent.public_description || null]
        );
        console.log("Inserted:", agent.loop_tag);
      }
    } catch (e) {
      console.error("Error for", agent.loop_tag, e.message);
    }
  }

  await pool.end();
  console.log("Done. Seed marketplace agents.");
}

main();
