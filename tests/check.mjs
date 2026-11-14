// Checks the built site in dist/: every page exists, every internal link and
// asset resolves, each project has its page, and nothing loads from places it shouldn't.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
let fails = 0, passes = 0;
const ok = (cond, msg) => { if (cond) passes++; else { fails++; console.log(`!! ${msg}`); } };

const pages = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') && pages.push(p); } };
walk(dist);

const projects = ['ergo', 'lacuna', 'btwn-the-dots', 'render', 'robotics'];
for (const s of projects) ok(existsSync(join(dist, 'work', s, 'index.html')), `page for ${s}`);
ok(existsSync(join(dist, 'index.html')), 'front page');
ok(existsSync(join(dist, '404.html')), '404 page');

const resolve = (from, url) => {
  const u = url.split('#')[0].split('?')[0];
  if (!u) return true;
  const p = u.startsWith('/') ? join(dist, u) : join(from, '..', u);
  return existsSync(p) && (statSync(p).isFile() || existsSync(join(p, 'index.html')));
};
for (const page of pages) {
  const html = readFileSync(page, 'utf8'), rel = page.slice(dist.length);
  for (const [, url] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:|mailto:|#|data:)/.test(url)) continue;
    ok(resolve(page, url), `${rel}: link ${url} resolves`);
  }
  for (const [, url] of html.matchAll(/<script[^>]*src="(https?:[^"]+)"/g)) ok(false, `${rel}: external script ${url}`);
  for (const [, url] of html.matchAll(/<link[^>]*href="(https?:[^"]+)"/g)) {
    ok(/^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|kalebj25\.github\.io)(\/|$)/.test(url), `${rel}: link to ${url} allowed`);
  }
  ok(/<title>[^<]+<\/title>/.test(html), `${rel}: has a title`);
  ok(!/@gmail\.com/.test(html), `${rel}: no personal email address`);
}

const front = readFileSync(join(dist, 'index.html'), 'utf8');
for (const s of projects) ok(front.includes(`href="/work/${s}/"`), `front page links to ${s}`);
ok((front.match(/class="node project|class="node next/g) || []).length === projects.length, 'web has a node per project');
ok(front.includes('>…</span>'), 'web center is the ellipsis');

console.log(fails ? `FAIL — ${passes}/${passes + fails}` : `PASS — ${passes}/${passes}`);
process.exit(fails ? 1 : 0);
