// DistroMap scoring. Pure, explainable, no dependencies.
// fit = audienceOverlap (0..1) * reachWeight * integrationEase, each factor reported.
// index.html inlines a copy of this file so it works from file://. Keep them in sync.

export const REACH_WEIGHT = { S: 0.5, M: 0.75, L: 1.0, XL: 1.15 };
export const REACH_LABEL = { S: "under 1M", M: "1 to 10M", L: "10 to 50M", XL: "50M+" };
export const INTEGRATION_EASE = {
  content: 1.0, community: 1.0, affiliate: 0.95, widget: 0.9, card: 0.9, creator: 0.9, bot: 0.85,
  event: 0.8, store: 0.7, partnership: 0.65, "mini-app": 0.6, spot: 0.55, api: 0.6,
};

// Tag vocabulary, grouped for the UI. Tags not listed here fall into "Other".
export const TAG_GROUPS = {
  "Life stage": ["student", "young", "learner", "professional", "salaried", "family", "gig-worker", "all-ages", "18-24", "18-30", "18-35", "20-40", "25-40", "25-45", "30-50", "30-55"],
  "Geography": ["urban", "tier2-3", "vernacular"],
  "Intent": ["investor", "trader", "high-intent-finance", "payments", "credit-card", "borrower", "spender", "skeptical", "general"],
  "Income": ["mass", "affluent", "small-business"],
  "Skew": ["male-skew", "women-skew"],
};

export function collectTags(surfaces) {
  const seen = new Set();
  for (const s of surfaces) for (const t of s.audience) seen.add(t.toLowerCase());
  const grouped = {};
  for (const [group, tags] of Object.entries(TAG_GROUPS)) {
    grouped[group] = tags.filter((t) => seen.has(t));
  }
  const listed = new Set(Object.values(TAG_GROUPS).flat());
  const other = [...seen].filter((t) => !listed.has(t)).sort();
  if (other.length) grouped["Other"] = other;
  return grouped;
}

export function scoreSurface(surface, targetTags) {
  const target = new Set(targetTags.map((t) => t.toLowerCase()));
  const matched = surface.audience.filter((t) => target.has(t.toLowerCase()));
  const overlap = target.size ? matched.length / target.size : 0;
  const reach = REACH_WEIGHT[surface.reach] ?? 0.5;
  const ease = Math.max(...surface.integration.map((i) => INTEGRATION_EASE[i] ?? 0.5));
  const score = Math.round(overlap * reach * ease * 100);
  const matchedLower = new Set(matched.map((m) => m.toLowerCase()));
  return {
    id: surface.id,
    name: surface.name,
    category: surface.category,
    reach: surface.reach,
    integration: surface.integration,
    audience: surface.audience,
    verify: !!surface.verify,
    score,
    factors: {
      overlap: +overlap.toFixed(2),
      matched,
      missed: [...target].filter((t) => !matchedLower.has(t)),
      reach: surface.reach,
      reachWeight: reach,
      ease,
      easiestIntegration: surface.integration.find((i) => (INTEGRATION_EASE[i] ?? 0.5) === ease),
    },
    wayIn: surface.wayIn,
    example: surface.example,
  };
}

// options.integration: keep only surfaces that offer this integration type.
// options.sortBy: "fit" (default) or "reach". The shortlist is always the top `limit` by fit;
// sortBy only reorders it. Ties fall back to the other factor, then name.
export function rankSurfaces(surfaces, targetTags, limit = 12, options = {}) {
  const byFit = (a, b) => b.score - a.score || b.factors.reachWeight - a.factors.reachWeight || a.name.localeCompare(b.name);
  const byReach = (a, b) => b.factors.reachWeight - a.factors.reachWeight || b.score - a.score || a.name.localeCompare(b.name);
  const shortlist = surfaces
    .filter((s) => !options.integration || s.integration.includes(options.integration))
    .map((s) => scoreSurface(s, targetTags))
    .filter((r) => r.score > 0)
    .sort(byFit)
    .slice(0, limit);
  return options.sortBy === "reach" ? shortlist.sort(byReach) : shortlist;
}

export function toPlaybook(product, targetTags, ranked, meta = {}) {
  const asOf = meta.asOf ? ` Reach bands as of ${meta.asOf}.` : "";
  const lines = [
    `# Distribution playbook: ${product}`,
    ``,
    `Target user tags: ${targetTags.join(", ")}`,
    ``,
    `Scores are deterministic: audience overlap x reach weight x integration ease.${asOf} Bands are order-of-magnitude; "verify" marks a band I am not sure of.`,
    ``,
    `## Shortlist`,
    ``,
    `| # | Surface | Fit | Reach | Easiest way in | Why |`,
    `|---|---|---|---|---|---|`,
    ...ranked.map((r, i) => `| ${i + 1} | ${r.name} | ${r.score} | ${r.factors.reach}${r.verify ? " (verify)" : ""} | ${r.factors.easiestIntegration} | matched: ${r.factors.matched.join(", ")} |`),
    ``,
    `## Pitch angles`,
    ``,
    ...ranked.slice(0, 5).map((r) => `### ${r.name}\n${r.wayIn}${r.example ? `\n\n_Precedent: ${r.example}_` : ""}\n`),
    `## KPI to negotiate`,
    ``,
    `Ask for qualified actions (sign-ups, tracked portfolios, completed flows), never impressions.`,
    ``,
    `## Next 30 days`,
    ``,
    `- Week 1: outreach to the top 3.`,
    `- Week 2: prototype the embed for #1.`,
    `- Weeks 3 and 4: pilot, measure, decide.`,
  ];
  return lines.join("\n");
}
