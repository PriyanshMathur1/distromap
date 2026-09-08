# Astra Codex brief: build DistroMap v1

Paste this into Astra Codex from inside the `projects/distromap` folder.

```
You are building DistroMap v1 from the PRD in README.md. Read README.md, data/surfaces.json and src/score.js first. Do not change the scoring semantics; extend them.

BUILD
1. index.html: a single-file app (HTML + CSS + vanilla JS modules, no framework, no build step) that:
   - Takes: product name, category (select), and target-user tags (chips; suggest from the union of audience tags in surfaces.json).
   - Shows: ranked surfaces as rows (not cards): name, fit score with a small bar, reach band, easiest integration, and an expandable "why" that prints every factor from score.js. Sort and filter by integration type.
   - Exports: a Markdown playbook via toPlaybook(); copy-to-clipboard and download as .md.
   - Shares: encodes inputs in the URL hash so a map is linkable.
2. Expand data/surfaces.json to ~80 Indian surfaces across: finance news, UPI/super-apps, creator platforms, vernacular social, messaging, communities, B2B2C (payroll, employers, colleges), telecom, commerce. Every entry needs a real wayIn sentence and the same tag vocabulary. Mark uncertain reach bands with "verify": true.
3. tests/score.test.js with node:test covering overlap, reach weights, ease, ranking order and playbook output.

DESIGN
- Utility-first, dense, fast. One accent colour. No gradients, no cards-with-icons, no hero illustration. It should look like a tool a founder uses at 11pm, not a landing page.
- Mobile works; desktop is primary.

QUALITY
- No console errors, Lighthouse ≥95 mobile, keyboard-navigable, respects prefers-reduced-motion.
- Write a 45-second demo script in docs/DEMO.md (what to click, what to say).

When done: list what you built, what you could not verify in the dataset, and three ideas for v2 that you did NOT build.
```
