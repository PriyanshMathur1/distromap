// Copies data/surfaces.json and src/score.js into index.html so the page works from file://.
// Run: node scripts/sync.js
// tests/score.test.js checks that index.html is in sync with both sources.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const EXPORTS = ["REACH_WEIGHT", "REACH_LABEL", "INTEGRATION_EASE", "TAG_GROUPS", "collectTags", "scoreSurface", "rankSurfaces", "toPlaybook"];

export function inlineData(json) {
  return JSON.stringify(JSON.parse(json)).replace(/<\//g, "<\\/");
}

export function inlineScore(src) {
  const body = src.replace(/^export /gm, "");
  return `window.DistroScore = (() => {\n${body}\nreturn { ${EXPORTS.join(", ")} };\n})();`;
}

export function inject(html, json, src) {
  const dataRe = /(<script type="application\/json" id="surfaces">)[\s\S]*?(<\/script>)/;
  const scoreRe = /(<script id="score-inline">)[\s\S]*?(<\/script>)/;
  if (!dataRe.test(html) || !scoreRe.test(html)) throw new Error("index.html is missing the inline script tags");
  return html
    .replace(dataRe, (_, a, b) => `${a}\n${inlineData(json)}\n${b}`)
    .replace(scoreRe, (_, a, b) => `${a}\n${inlineScore(src)}\n${b}`);
}

export function readAll() {
  return {
    html: readFileSync(join(root, "index.html"), "utf8"),
    json: readFileSync(join(root, "data", "surfaces.json"), "utf8"),
    src: readFileSync(join(root, "src", "score.js"), "utf8"),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { html, json, src } = readAll();
  const out = inject(html, json, src);
  writeFileSync(join(root, "index.html"), out);
  console.log(`index.html synced: ${JSON.parse(json).surfaces.length} surfaces, ${out.length} bytes`);
}
