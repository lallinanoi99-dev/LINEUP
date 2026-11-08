// Cache-busting: rewrites the asset version in index.html (CSS, main.js, and an
// import map that versions every ES module). Run before pushing a release:
//   node scripts/stamp.mjs
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const v = Date.now().toString(36);
const mods = [];
(function walk(dir) {
  for (const f of fs.readdirSync(path.join(root, dir))) {
    const rel = `${dir}/${f}`;
    if (fs.statSync(path.join(root, rel)).isDirectory()) walk(rel);
    else if (f.endsWith(".js")) mods.push(rel);
  }
})("assets/js");
const map = { imports: Object.fromEntries(mods.sort().map((m) => [`./${m}`, `./${m}?v=${v}`])) };
let html = fs.readFileSync(path.join(root, "index.html"), "utf8");
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>\n\s*/, "");
html = html.replace(/assets\/css\/style\.css(\?v=[\w]+)?/, `assets/css/style.css?v=${v}`);
html = html.replace(
  /<script type="module" src="assets\/js\/main\.js(\?v=[\w]+)?"><\/script>/,
  `<script type="importmap">${JSON.stringify(map)}</script>\n  <script type="module" src="assets/js/main.js?v=${v}"></script>`
);
fs.writeFileSync(path.join(root, "index.html"), html);
console.log(`Stamped assets with v=${v} (${mods.length} modules)`);
