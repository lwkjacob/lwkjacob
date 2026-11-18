// Draws dist/languages.svg: share of code (by bytes) per language across all of a user's own public repos.
// Usage: node languages.js <user> <outFile>   (uses GITHUB_TOKEN if set)
const fs = require('fs');
const path = require('path');

const [user = 'lwkjacob', outFile = 'dist/languages.svg'] = process.argv.slice(2);
const headers = { 'User-Agent': 'profile-languages', Accept: 'application/vnd.github+json' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const get = async url => {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
};

const SHADES = ['#ffffff', '#d6d6d6', '#adadad', '#858585', '#636363', '#474747', '#333333'];
const MAX = 6;

(async () => {
  const repos = (await get(`https://api.github.com/users/${user}/repos?per_page=100&type=owner`))
    .filter(r => !r.fork && !r.archived && r.name !== user);

  const totals = {};
  for (const r of repos) {
    for (const [lang, bytes] of Object.entries(await get(r.languages_url))) {
      totals[lang] = (totals[lang] || 0) + bytes;
    }
  }

  const sum = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
  let langs = Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([name, b]) => ({ name, pct: (b / sum) * 100 }));
  if (langs.length > MAX) {
    const rest = langs.slice(MAX - 1).reduce((a, l) => a + l.pct, 0);
    langs = [...langs.slice(0, MAX - 1), { name: 'Other', pct: rest }];
  }

  const W = 1000, barX = 30, barW = W - 60;
  let x = barX;
  const segments = langs.map((l, i) => {
    const w = Math.max((l.pct / 100) * barW - 3, 2);
    const seg = `<rect x="${x.toFixed(1)}" y="70" height="14" rx="3" fill="${SHADES[i]}" width="0">` +
      `<animate attributeName="width" from="0" to="${w.toFixed(1)}" begin="${(0.2 + i * 0.15).toFixed(2)}s" dur="0.6s" fill="freeze"/></rect>`;
    x += (l.pct / 100) * barW;
    return seg;
  }).join('\n    ');

  const colW = barW / 3;
  const rows = langs.map((l, i) => {
    const cx = barX + (i % 3) * colW, cy = 128 + Math.floor(i / 3) * 52;
    const track = colW - 40;
    return `<g class="in" style="animation-delay:${(0.5 + i * 0.12).toFixed(2)}s">
      <circle cx="${cx + 6}" cy="${cy - 5}" r="5" fill="${SHADES[i]}"/>
      <text x="${cx + 20}" y="${cy}" class="n">${l.name}</text>
      <text x="${cx + track}" y="${cy}" class="v" text-anchor="end">${l.pct.toFixed(1)}%</text>
      <rect x="${cx}" y="${cy + 12}" width="${track}" height="3" rx="1.5" fill="#1f1f1f"/>
      <rect x="${cx}" y="${cy + 12}" height="3" rx="1.5" fill="${SHADES[i]}" width="0"><animate attributeName="width" from="0" to="${((l.pct / 100) * track).toFixed(1)}" begin="${(0.6 + i * 0.12).toFixed(2)}s" dur="0.8s" fill="freeze"/></rect>
    </g>`;
  }).join('\n    ');

  const H = 128 + Math.ceil(langs.length / 3) * 52 + 4;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>
    text { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; }
    .t { font-size: 18px; font-weight: 700; fill: #ffffff; }
    .s { font: 600 11px Consolas, Menlo, monospace; letter-spacing: 2px; fill: #6e6e6e; }
    .n { font-size: 15px; fill: #e6e6e6; }
    .v { font: 600 14px Consolas, Menlo, monospace; fill: #ffffff; }
    .in { opacity: 0; animation: in .5s ease-out forwards; }
    @keyframes in { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: none } }
  </style>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="14" fill="#0d1117"/>
  <text x="30" y="42" class="t">Languages</text>
  <text x="${W - 30}" y="42" class="s" text-anchor="end">ACROSS ${repos.length} REPOS · BY BYTES</text>
  <rect x="${barX}" y="70" width="${barW}" height="14" rx="3" fill="#161616"/>
    ${segments}
    ${rows}
</svg>
`;
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, svg);
  console.log(langs.map(l => `${l.name} ${l.pct.toFixed(1)}%`).join(', '));
})().catch(e => { console.error(e); process.exit(1); });
