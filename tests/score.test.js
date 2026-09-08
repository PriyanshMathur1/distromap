import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { scoreSurface, rankSurfaces, toPlaybook, collectTags, REACH_WEIGHT, INTEGRATION_EASE, TAG_GROUPS } from "../src/score.js";

const here = dirname(fileURLToPath(import.meta.url));
const dataset = JSON.parse(readFileSync(join(here, "..", "data", "surfaces.json"), "utf8"));

const mk = (over = {}) => ({
  id: "x", name: "X", category: "test", reach: "M", audience: ["urban", "investor", "25-40"],
  integration: ["partnership"], wayIn: "Way in for X.", example: "", ...over,
});

test("overlap is matched tags over target tags, case-insensitive", () => {
  const r = scoreSurface(mk(), ["Urban", "INVESTOR", "tier2-3", "salaried"]);
  assert.equal(r.factors.overlap, 0.5);
  assert.deepEqual(r.factors.matched, ["urban", "investor"]);
  assert.deepEqual(r.factors.missed, ["tier2-3", "salaried"]);
});

test("empty target gives zero overlap and zero score", () => {
  const r = scoreSurface(mk(), []);
  assert.equal(r.factors.overlap, 0);
  assert.equal(r.score, 0);
});

test("reach weights are applied and unknown bands fall back to 0.5", () => {
  const tags = ["urban", "investor", "25-40"];
  const s = scoreSurface(mk({ reach: "S" }), tags);
  const xl = scoreSurface(mk({ reach: "XL" }), tags);
  const bad = scoreSurface(mk({ reach: "??" }), tags);
  assert.equal(s.factors.reachWeight, REACH_WEIGHT.S);
  assert.equal(xl.factors.reachWeight, REACH_WEIGHT.XL);
  assert.equal(bad.factors.reachWeight, 0.5);
  assert.ok(xl.score > s.score);
  // full overlap, partnership ease 0.65: XL = round(1 * 1.15 * 0.65 * 100) = 75
  assert.equal(xl.score, 75);
});

test("ease picks the easiest integration offered and names it", () => {
  const r = scoreSurface(mk({ integration: ["api", "partnership", "widget"] }), ["urban"]);
  assert.equal(r.factors.ease, INTEGRATION_EASE.widget);
  assert.equal(r.factors.easiestIntegration, "widget");
  const u = scoreSurface(mk({ integration: ["unknown-type"] }), ["urban"]);
  assert.equal(u.factors.ease, 0.5);
  assert.equal(u.factors.easiestIntegration, "unknown-type");
});

test("score is the rounded product of the three factors", () => {
  const r = scoreSurface(mk({ reach: "L", integration: ["content"] }), ["urban", "investor", "student", "young"]);
  // overlap 0.5 * reach 1.0 * ease 1.0 = 50
  assert.equal(r.score, 50);
});

test("ranking is descending by score, drops zero scores, and respects limit", () => {
  const surfaces = [
    mk({ id: "a", name: "A", reach: "S", audience: ["urban"] }),
    mk({ id: "b", name: "B", reach: "XL", audience: ["urban", "investor"] }),
    mk({ id: "c", name: "C", reach: "L", audience: ["student"] }),
    mk({ id: "d", name: "D", reach: "L", audience: ["urban", "investor"], integration: ["content"] }),
  ];
  const ranked = rankSurfaces(surfaces, ["urban", "investor"]);
  assert.deepEqual(ranked.map((r) => r.id), ["d", "b", "a"]);
  for (let i = 1; i < ranked.length; i++) assert.ok(ranked[i - 1].score >= ranked[i].score);
  assert.equal(rankSurfaces(surfaces, ["urban", "investor"], 2).length, 2);
});

test("ranking can filter by integration type and sort by reach", () => {
  const surfaces = [
    mk({ id: "a", name: "A", reach: "S", integration: ["widget"] }),
    mk({ id: "b", name: "B", reach: "XL", integration: ["api"] }),
    mk({ id: "c", name: "C", reach: "L", integration: ["widget", "api"] }),
  ];
  const widgets = rankSurfaces(surfaces, ["urban"], 12, { integration: "widget" });
  assert.deepEqual(widgets.map((r) => r.id), ["c", "a"]);
  const byReach = rankSurfaces(surfaces, ["urban"], 12, { sortBy: "reach" });
  assert.deepEqual(byReach.map((r) => r.id), ["b", "c", "a"]);
  // sort by reach reorders the fit shortlist; it does not admit weaker fits
  const top2 = rankSurfaces(surfaces, ["urban"], 2, { sortBy: "reach" });
  assert.deepEqual(top2.map((r) => r.id), ["b", "c"]);
});

test("playbook contains the shortlist table, pitch angles and KPI", () => {
  const ranked = rankSurfaces(dataset.surfaces, ["salaried", "urban", "investor", "25-40"]);
  const md = toPlaybook("Acme Wealth", ["salaried", "urban", "investor", "25-40"], ranked, { asOf: dataset.asOf });
  assert.ok(md.startsWith("# Distribution playbook: Acme Wealth"));
  assert.ok(md.includes("## Shortlist"));
  assert.ok(md.includes("| # | Surface | Fit | Reach | Easiest way in | Why |"));
  assert.ok(md.includes(`| 1 | ${ranked[0].name} | ${ranked[0].score} |`));
  assert.ok(md.includes("## Pitch angles"));
  assert.ok(md.includes(`### ${ranked[0].name}`));
  assert.ok(md.includes(ranked[0].wayIn));
  assert.ok(md.includes("## KPI to negotiate"));
  assert.ok(md.includes(`as of ${dataset.asOf}`));
  assert.ok(!md.includes("—"), "no em-dashes in the playbook");
});

test("dataset is well-formed and every tag belongs to the vocabulary", () => {
  assert.ok(dataset.surfaces.length >= 75 && dataset.surfaces.length <= 85, `count ${dataset.surfaces.length}`);
  const ids = new Set();
  const vocab = new Set(Object.values(TAG_GROUPS).flat());
  for (const s of dataset.surfaces) {
    assert.ok(!ids.has(s.id), `duplicate id ${s.id}`);
    ids.add(s.id);
    assert.ok(REACH_WEIGHT[s.reach], `${s.id} has unknown reach ${s.reach}`);
    assert.ok(s.wayIn && s.wayIn.length > 40, `${s.id} wayIn too short`);
    for (const t of s.audience) assert.ok(vocab.has(t), `${s.id} uses unlisted tag ${t}`);
    for (const i of s.integration) assert.ok(INTEGRATION_EASE[i], `${s.id} uses unlisted integration ${i}`);
    assert.ok(!JSON.stringify(s).includes("—"), `${s.id} contains an em-dash`);
  }
  const grouped = collectTags(dataset.surfaces);
  assert.ok(grouped["Life stage"].includes("salaried"));
  assert.ok(grouped["Geography"].includes("tier2-3"));
  assert.equal(grouped["Other"], undefined);
});

test("presets from the UI produce a non-empty shortlist", () => {
  const presets = [
    ["salaried", "urban", "professional", "investor", "25-40", "high-intent-finance"],
    ["tier2-3", "vernacular", "young", "learner", "investor", "mass"],
    ["small-business", "payments", "tier2-3", "borrower", "30-50"],
  ];
  for (const tags of presets) {
    const ranked = rankSurfaces(dataset.surfaces, tags, 15);
    assert.ok(ranked.length >= 10, `preset ${tags[0]} only produced ${ranked.length}`);
  }
});

test("index.html carries an in-sync copy of the dataset and score.js", async () => {
  const { inject, readAll } = await import("../scripts/sync.js");
  const { html, json, src } = readAll();
  assert.equal(inject(html, json, src), html, "run `node scripts/sync.js` to refresh index.html");
  assert.ok(!html.includes("—"), "no em-dashes in index.html");
});
