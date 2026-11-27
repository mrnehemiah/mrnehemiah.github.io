export function resolveRecommendationQuery(currentMessage, previousQuery, marketplaceSearch, normalizeQuery) {
  const normalize = typeof normalizeQuery === "function"
    ? normalizeQuery
    : value => String(value || "").toLowerCase();

  const explicit = normalize(currentMessage)
    .replace(/\b(?:please|can you|could you|show me|give me|recommendations?|recommend|mapendekezo|nipendekee|nipendekezee|pendekeza|nipe|nionyeshe|bidhaa|products?)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return explicit || String(previousQuery || "").trim() || String(marketplaceSearch || "").trim();
}

export function getRecommendationTokens(query, expandTokens) {
  if (typeof expandTokens !== "function") return [];
  return [...new Set(
    expandTokens(query)
      .map(token => String(token || "").trim().toLowerCase())
      .filter(token => token.length > 2)
  )];
}

export function rankRecommendationProducts(products, tokens, normalizeQuery) {
  if (!Array.isArray(products) || !Array.isArray(tokens) || !tokens.length) return [];

  const normalize = typeof normalizeQuery === "function"
    ? normalizeQuery
    : value => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const normalizedTokens = tokens.map(normalize).filter(Boolean);

  return products
    .map(product => {
      const searchable = normalize([
        product?.title,
        product?.description,
        product?.category,
        product?.brand,
        product?.brand_name
      ].filter(Boolean).join(" "));
      const words = new Set(searchable.split(/\s+/).filter(Boolean));
      const matchedTokens = normalizedTokens.reduce((count, token) => count + (words.has(token) ? 1 : 0), 0);
      const stockBonus = Number(product?.stock_quantity) > 0 ? 0.25 : 0;
      return { product, matchedTokens, score: matchedTokens + stockBonus };
    })
    .filter(row => row.matchedTokens > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(row => row.product);
}

export function countLoadedBrands(products) {
  if (!Array.isArray(products)) return 0;
  const brands = new Set();
  for (const product of products) {
    const name = String(product?.brand || product?.brand_name || "").trim().toLowerCase();
    if (name) brands.add(name);
  }
  return brands.size;
}
