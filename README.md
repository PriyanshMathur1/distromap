# DistroMap: where do your users already live?

> A tool that maps the surfaces (apps, platforms, communities) where a product's target users *already* spend time in India, and turns that into an embedded-distribution playbook. Built by a growth PM who took a wealth product to 20M users this exact way.

**Status:** v1, working · **Owner:** Priyansh Mathur · **Live:** https://claude.ai/code/artifact/538b57c8-5f9a-4dce-a604-43cd09fec086 (preview; move to distromap.priyanshmathur.com on Cloudflare Pages)

---

## How to run

No build step, no dependencies.

- **Use it:** open `index.html` in a browser. It works from `file://` and from any static host.
- **Test it:** `node --test` from this folder (Node 20+). Node's runner finds `tests/*.test.js` on its own; `node --test tests/*.test.js` also works.
- **Edit the data or the scoring:** change `data/surfaces.json` or `src/score.js`, then run `node scripts/sync.js`. The page carries an inlined copy of both so it works when opened as a file or published as a single HTML page; `data/surfaces.json` and `src/score.js` stay the source of truth, and the test suite fails if `index.html` drifts from them.
- **Share a map:** every input (product, category, tags, filter, sort) is in the URL hash, so copy the address.
- **Demo:** `docs/DEMO.md` is a 45-second script.

### Tag vocabulary

Audience tags are grouped in `src/score.js` (`TAG_GROUPS`): life stage (including age bands), geography, intent, income, skew. Adding a surface with a tag outside the vocabulary fails the tests on purpose; add the tag to `TAG_GROUPS` if it earns its place.

## 1. Problem

Early-stage Indian consumer products default to paid acquisition (Meta/Google) and app-store downloads. CAC is brutal, retention is worse, and most teams never ask the cheaper question: *which apps do our users already open every day, and can we live inside them?*

Dezerv answered it by embedding a portfolio tracker inside Moneycontrol, Livemint and Inshorts: 20M reachable users, 75% lower CAC than paid, 140K organic sessions/month. Almost no one has a repeatable way to find those surfaces.

## 2. Users

- **Primary:** founders and growth PMs at Indian consumer startups (fintech, health, edtech, D2C) at pre-seed to Series B, deciding where to spend the next quarter of distribution effort.
- **Secondary:** BD/partnerships leads who need a target list with a pitch angle per partner.

## 3. Job to be done

"When I know who my user is but not where to reach them cheaply, help me find the surfaces they already use and give me a concrete way in, so I can pitch three partnerships this month instead of buying installs."

## 4. Success metric

- North star: **playbooks exported per week**.
- Leading: % of sessions that reach a scored surface list (target ≥60%); median time to first playbook < 3 min.
- Vanity to ignore: page views.

## 5. Scope (v1)

| Must | Should | Won't (v1) |
|---|---|---|
| Input: product category + target user (age band, income band, intent) | Save/share a map via URL | Live traffic data from paid APIs |
| Output: ranked list of 10–15 Indian surfaces with reach band, audience fit, integration type (widget / API / content / community / WhatsApp), and a "way in" | Compare two audiences side by side | User accounts |
| Playbook export (Markdown): partner shortlist, pitch angle, embed format, KPI to negotiate | LLM-generated first-draft outreach email per partner | Non-India markets |
| Curated dataset of 80 Indian surfaces (news, UPI, super-apps, creator platforms, communities), hand-tagged | Community-submitted surfaces | Auto-scraping |

## 6. How it works

1. **Dataset** `data/surfaces.json`: each surface has `id, name, category, reach (S/M/L/XL), audience[], integration[], wayIn, example` and an optional `verify: true` where the reach band is a guess. The file carries one `asOf` date.
2. **Scoring** `src/score.js`: fit = audience-tag overlap × reach weight × integration ease, rounded to 0..100. Fully deterministic and explainable (each score shows its factors). Sort by reach reorders the fit shortlist; it never admits weaker fits.
3. **LLM layer (optional)**: given the top 5 surfaces, draft the pitch angle and outreach email. Runs client-side with a user-supplied key or via a tiny serverless function.
4. **Export**: one Markdown playbook, copied to clipboard or downloaded.

## 7. Non-goals

Not an analytics tool, not a marketplace, not a lead-gen form. It ends when the founder has a shortlist and a pitch.

## 8. Risks

- Reach bands go stale → the dataset carries an `asOf` date and per-surface `verify` flags; both are shown in the UI and the export.
- "Generic list" feeling → the score explanation and the *way in* per surface are the product; if those are weak the tool is weak.
- Scope creep into a CRM → hard "won't" list above.

## 9. Resume line (draft)

> Built DistroMap, an open-source tool that maps where a product's users already are across 80 Indian surfaces and generates an embedded-distribution playbook; used by [N] founders in its first month.

## 10. Repo layout

```
distromap/
  README.md            ← this PRD and how to run
  index.html           ← single-file app (no build step; inlines data and scoring)
  data/surfaces.json   ← curated dataset, 80 surfaces, source of truth
  src/score.js         ← scoring logic (pure functions, unit-tested)
  scripts/sync.js      ← copies data and scoring into index.html
  tests/score.test.js  ← node:test suite (`node --test`)
  docs/DEMO.md         ← 45-second demo script
  docs/PLAYBOOK_TEMPLATE.md
  ASTRA_BRIEF.md       ← the build brief used for v1
```

## 11. Not built in v1 (ideas for v2)

- Compare two audiences side by side.
- LLM-drafted outreach email per partner (client-side, user-supplied key).
- Community-submitted surfaces with a review queue and a per-surface `source` link.
