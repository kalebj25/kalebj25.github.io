// Layout in a real browser (WebKit): desktop, narrow and phone. Serves dist/,
// then checks the web, its card and dragging, the bench, the project pages and
// horizontal overflow. Screenshots land in tests/shots/ (ignored by git).
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { webkit } from 'playwright';

const dist = new URL('../dist/', import.meta.url).pathname;
const shots = new URL('./shots/', import.meta.url).pathname;
mkdirSync(shots, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer((req, res) => {
  let p = join(dist, decodeURIComponent(req.url.split('?')[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) { res.writeHead(404, { 'content-type': 'text/html' }); res.end(readFileSync(join(dist, '404.html'))); return; }
  res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

let fails = 0, passes = 0;
const ok = (cond, msg) => { if (cond) passes++; else { fails++; console.log(`!! ${msg}`); } };

const sizes = [['desktop', 1440, 900], ['narrow', 900, 1000], ['phone', 375, 812]];
const slugs = ['ergo', 'lacuna', 'btwn-the-dots', 'render', 'robotics'];
const browser = await webkit.launch();

const drawn = (page) => page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth)).then(() => page.waitForTimeout(200));
const settled = (page) => page.waitForFunction(() => {
  const s = [...document.querySelectorAll('.web .node')].map((n) => n.style.left + n.style.top).join();
  const prev = window.__prev; window.__prev = s; return prev === s;
}, null, { polling: 400, timeout: 15000 });

for (const [name, w, h] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/`);
  await settled(page);
  await drawn(page);
  await page.screenshot({ path: `${shots}${name}-front.png`, fullPage: true });

  const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  ok(over <= 0, `${name}: front page scrolls sideways by ${over}px`);

  const web = await page.locator('.web').boundingBox();
  const nodes = await page.locator('.web .node').evaluateAll((els) => els.map((e) => {
    const r = e.getBoundingClientRect(), n = e.querySelector('.name').getBoundingClientRect();
    return { cls: e.className, x: r.x + r.width / 2, y: r.y + r.height / 2, n: { l: n.left, r: n.right, t: n.top, b: n.bottom } };
  }));
  ok(nodes.length === 18, `${name}: 18 nodes in the web (got ${nodes.length})`);
  for (const n of nodes) {
    ok(n.x >= web.x && n.x <= web.x + web.width && n.y >= web.y && n.y <= web.y + web.height, `${name}: node ${n.cls} inside the web`);
    ok(n.n.l >= web.x - 1 && n.n.r <= web.x + web.width + 1, `${name}: label of ${n.cls} not cut off`);
  }
  const big = nodes.filter((n) => /project|next/.test(n.cls));
  for (let i = 0; i < big.length; i++) for (let j = i + 1; j < big.length; j++) {
    const a = big[i].n, b = big[j].n;
    ok(a.r < b.l || b.r < a.l || a.b < b.t || b.b < a.t, `${name}: project labels ${i} and ${j} overlap`);
  }

  // A project opens its card; Escape closes it.
  await page.locator('.web .node.project').first().click();
  const card = page.locator('[data-card]');
  ok(await card.isVisible(), `${name}: picking ERGO opens its card`);
  ok((await card.locator('a').getAttribute('href')) === '/work/ergo/', `${name}: card links to the ERGO page`);
  const cb = await card.boundingBox();
  ok(cb.x >= web.x && cb.x + cb.width <= web.x + web.width + 1, `${name}: card fits in the web`);
  await page.screenshot({ path: `${shots}${name}-card.png` });
  await page.keyboard.press('Escape');
  ok(!(await card.isVisible()), `${name}: Escape closes the card`);

  // Dragging an idea moves it.
  const idea = page.locator('.web .node.idea').first();
  const b0 = await idea.boundingBox();
  await page.mouse.move(b0.x + b0.width / 2, b0.y + b0.height / 2);
  await page.mouse.down();
  await page.mouse.move(web.x + 60, web.y + 60, { steps: 8 });
  await page.mouse.up();
  const b1 = await idea.boundingBox();
  ok(Math.hypot(b1.x - b0.x, b1.y - b0.y) > 20, `${name}: dragging a node moves it`);
  ok(!(await card.isVisible()), `${name}: a drag doesn't open a card`);

  // Bench and touch targets
  ok((await page.locator('#bench a.bench-card').count()) === 5, `${name}: five bench cards`);
  const small = await page.locator('a.tap, .web button.node, .pips a').evaluateAll((els) =>
    els.filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.height < 44 || r.width < 44); }).map((e) => e.textContent.trim()));
  ok(small.length === 0, `${name}: small tap targets: ${small.join(', ')}`);

  for (const s of slugs) {
    await page.goto(`${base}/work/${s}/`);
    const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ok(o <= 0, `${name}: /work/${s}/ scrolls sideways by ${o}px`);
    ok((await page.locator('.pips a[aria-current="page"]').count()) === 1, `${name}: ${s} marks itself in the pager`);
    if (s === 'ergo' || s === 'render') await drawn(page), await page.screenshot({ path: `${shots}${name}-${s}.png`, fullPage: true });
  }
  const sm = await page.locator('a.tap, .pips a').evaluateAll((els) =>
    els.filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.height < 44; }).length);
  ok(sm === 0, `${name}: project page tap targets at least 44px`);
  ok(errors.length === 0, `${name}: page errors: ${errors.join(' | ')}`);
  await ctx.close();
}

// Reduced motion: the web is placed at once and stays still.
const still = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const sp = await still.newPage();
await sp.goto(`${base}/`);
await sp.waitForTimeout(150);
const a = await sp.locator('.web .node').evaluateAll((els) => els.map((e) => e.style.left).join());
await sp.waitForTimeout(500);
const b = await sp.locator('.web .node').evaluateAll((els) => els.map((e) => e.style.left).join());
ok(a === b, 'reduced motion: the web does not move on its own');
await still.close();

// Unknown pages get the 404.
const nf = await browser.newPage();
await nf.goto(`${base}/nope/`);
ok((await nf.locator('h1').textContent()).includes('Not made yet'), '404 page shows');

await browser.close();
server.close();
console.log(fails ? `FAIL — ${passes}/${passes + fails}` : `PASS — ${passes}/${passes}`);
process.exit(fails ? 1 : 0);
