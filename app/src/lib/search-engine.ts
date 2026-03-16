/**
 * PHASE 3: SEARCH & FILTERING
 * Find agents by domain, rating, trust score
 */

export interface SearchFilters {
  domain?: string; // "finance", "travel", "health"
  minRating?: number; // 1-5
  minTrustScore?: number; // 0-100
  maxPrice?: number; // cents per hour/task
  minSuccessfulHires?: number;
  verified?: boolean;
  sortBy?: "rating" | "trust" | "newest" | "earnings";
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  agent: {
    loop_tag: string;
    trust_score: number;
    average_rating: number;
    successful_hires: number;
    persona: string;
    public_description: string;
    verifications: string[];
    badges: string[];
  };
  relevance_score: number;
}

/**
 * Search Engine
 */
export class SearchEngine {
  /**
   * Search marketplace with filters
   */
  async search(filters: SearchFilters): Promise<SearchResult[]> {
    let query = `
      SELECT 
        l.loop_tag,
        l.trust_score,
        l.persona,
        l.public_description,
        l.agent_bio,
        COALESCE((SELECT AVG(CAST(rating AS DECIMAL)) FROM reviews WHERE loop_id = l.id), 0) as average_rating,
        COALESCE((SELECT COUNT(*) FROM transactions WHERE seller_id = l.id AND status = 'completed'), 0) as successful_hires,
        COALESCE((SELECT COUNT(*) FROM agent_verifications WHERE loop_id = l.id), 0) as verification_count
      FROM loops l
      WHERE l.status = 'active'
    `;

    const params: any[] = [];
    let paramCount = 1;

    // Domain filter (from persona or business_category)
    if (filters.domain) {
      query += ` AND (l.persona ILIKE $${paramCount} OR l.business_category ILIKE $${paramCount})`;
      params.push(`%${filters.domain}%`);
      paramCount++;
    }

    // Rating filter
    if (filters.minRating) {
      query += ` AND (SELECT COALESCE(AVG(CAST(rating AS DECIMAL)), 0) FROM reviews WHERE loop_id = l.id) >= $${paramCount}`;
      params.push(filters.minRating);
      paramCount++;
    }

    // Trust score filter
    if (filters.minTrustScore) {
      query += ` AND COALESCE(l.trust_score, 50) >= $${paramCount}`;
      params.push(filters.minTrustScore);
      paramCount++;
    }

    // Minimum successful hires
    if (filters.minSuccessfulHires) {
      query += ` AND (SELECT COUNT(*) FROM transactions WHERE seller_id = l.id AND status = 'completed') >= $${paramCount}`;
      params.push(filters.minSuccessfulHires);
      paramCount++;
    }

    // Verified filter
    if (filters.verified) {
      query += ` AND EXISTS (SELECT 1 FROM agent_verifications WHERE loop_id = l.id)`;
    }

    // Sorting
    switch (filters.sortBy) {
      case "rating":
        query += ` ORDER BY (SELECT COALESCE(AVG(CAST(rating AS DECIMAL)), 0) FROM reviews WHERE loop_id = l.id) DESC`;
        break;
      case "trust":
        query += ` ORDER BY COALESCE(l.trust_score, 50) DESC`;
        break;
      case "newest":
        query += ` ORDER BY l.created_at DESC`;
        break;
      case "earnings":
        query += ` ORDER BY (SELECT COALESCE(SUM(amount_cents), 0) FROM transactions WHERE seller_id = l.id AND status = 'completed') DESC`;
        break;
      default:
        query += ` ORDER BY COALESCE(l.trust_score, 50) DESC`; // Default: trust score
    }

    // Pagination
    const limit = Math.min(filters.limit || 20, 100); // Max 100
    const offset = filters.offset || 0;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    // Execute query
    // const result = await database.query(query, params);

    // Format results with relevance scoring
    const results: SearchResult[] = []; // Format query results

    return results;
  }

  /**
   * Autocomplete agent tags
   */
  async autocomplete(prefix: string): Promise<string[]> {
    // SELECT loop_tag FROM loops
    // WHERE status = 'active' AND loop_tag ILIKE $1
    // LIMIT 10

    return []; // List of matching tags
  }

  /**
   * Get popular agents
   */
  async getPopular(domain?: string, limit: number = 10): Promise<SearchResult[]> {
    const filters: SearchFilters = {
      domain,
      sortBy: "rating",
      limit,
    };

    return this.search(filters);
  }

  /**
   * Get trending agents (hot this week)
   */
  async getTrending(limit: number = 10): Promise<SearchResult[]> {
    // SELECT agents with most hires in last 7 days
    // ORDER BY hire count DESC

    return []; // List of trending agents
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(agent: any, filters: SearchFilters): number {
    let score = 50; // Base score

    // Higher rating = higher relevance
    score += agent.average_rating * 10; // 0-50 points

    // Verified = higher relevance
    if (agent.verification_count > 0) {
      score += 20;
    }

    // More successful hires = higher relevance
    score += Math.min(agent.successful_hires / 10, 20); // 0-20 points

    // Trust score
    score += Math.min(agent.trust_score, 30); // 0-30 points

    return Math.min(score, 100);
  }
}

/**
 * API Endpoint: Search marketplace
 * GET /api/marketplace/search?domain=finance&minRating=4.5&sortBy=rating
 */
export async function searchMarketplaceEndpoint(filters: SearchFilters) {
  const engine = new SearchEngine();
  const results = await engine.search(filters);

  return {
    results,
    total: results.length,
    filters,
  };
}

/**
 * API Endpoint: Autocomplete
 * GET /api/marketplace/autocomplete?q=Sam
 */
export async function autocompleteEndpoint(prefix: string) {
  const engine = new SearchEngine();
  const suggestions = await engine.autocomplete(prefix);

  return { suggestions };
}

/**
 * API Endpoint: Popular agents
 * GET /api/marketplace/popular?domain=finance
 */
export async function getPopularEndpoint(domain?: string) {
  const engine = new SearchEngine();
  const popular = await engine.getPopular(domain, 20);

  return { popular };
}

/**
 * API Endpoint: Trending agents
 * GET /api/marketplace/trending
 */
export async function getTrendingEndpoint() {
  const engine = new SearchEngine();
  const trending = await engine.getTrending(10);

  return { trending };
}

// ============================================================================
// UI COMPONENTS (React/JSX)
// ============================================================================

/**
 * Search Filter Component
 * Props: onFilter(filters: SearchFilters)
 */
export const SearchFilterComponent = `
export function SearchFilters({ onFilter }) {
  const [domain, setDomain] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [minTrust, setMinTrust] = useState(0);
  const [sortBy, setSortBy] = useState('trust');

  const handleFilter = () => {
    onFilter({
      domain: domain || undefined,
      minRating: minRating || undefined,
      minTrustScore: minTrust || undefined,
      sortBy: sortBy as 'rating' | 'trust' | 'newest' | 'earnings',
    });
  };

  return (
    <div className="search-filters">
      <select value={domain} onChange={(e) => setDomain(e.target.value)}>
        <option value="">All Domains</option>
        <option value="finance">Finance</option>
        <option value="travel">Travel</option>
        <option value="health">Health</option>
      </select>

      <select value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
        <option value={0}>Any Rating</option>
        <option value={4}>4+ Stars</option>
        <option value={4.5}>4.5+ Stars</option>
        <option value={4.8}>4.8+ Stars</option>
      </select>

      <select value={minTrust} onChange={(e) => setMinTrust(Number(e.target.value))}>
        <option value={0}>Any Trust</option>
        <option value={60}>60+ Trust</option>
        <option value={75}>75+ Trust</option>
        <option value={85}>85+ Trust</option>
      </select>

      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
        <option value="trust">Sort by Trust</option>
        <option value="rating">Sort by Rating</option>
        <option value="newest">Newest First</option>
        <option value="earnings">Most Successful</option>
      </select>

      <button onClick={handleFilter}>Filter</button>
    </div>
  );
}
`;
