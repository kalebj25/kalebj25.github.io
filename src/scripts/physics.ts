// A small force simulation for the web: every node pushes the others away, every
// line pulls like a spring, and a gentle pull keeps the whole thing centered.
// It runs at build time (to place nodes for visitors without JavaScript) and in
// the browser (to move them). Coordinates are pixels of a W×H box.

export type Kind = 'me' | 'project' | 'next' | 'idea';
export interface Body { x: number; y: number; vx: number; vy: number }
export interface Sim {
  W: number; H: number; s: number;
  kinds: Kind[];
  bodies: Body[];
  links: { a: number; b: number; base: number; len: number }[];
  alpha: number;
  held: number | null;
}

// Room each kind of node needs, as half the label's width and height in pixels.
const ROOM: Record<Kind, [number, number]> = { me: [22, 20], project: [56, 22], next: [42, 22], idea: [38, 18] };

// Scale lengths and forces with the box, within limits so labels stay readable.
const scale = (W: number, H: number) => Math.min(1.25, Math.max(0.55, Math.sqrt((W * H) / (1000 * 560))));

export function createSim(kinds: Kind[], edges: [number, number][], W: number, H: number): Sim {
  const s = scale(W, H);
  let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const cx = W / 2, cy = H / 2, flat = Math.min(1, H / W + 0.15);
  const bodies = kinds.map((k, i) => {
    if (k === 'me') return { x: cx, y: cy, vx: 0, vy: 0 };
    const a = (i / kinds.length) * Math.PI * 2, r = (k === 'idea' ? 230 : 140) * s;
    return {
      x: cx + Math.cos(a) * r + (rnd() - 0.5) * 40 * s,
      y: cy + Math.sin(a) * r * flat + (rnd() - 0.5) * 40 * s,
      vx: 0, vy: 0,
    };
  });
  const links = edges.map(([a, b]) => {
    const base = kinds[a] === 'me' ? 170 : 100;
    return { a, b, base, len: base * s };
  });
  return { W, H, s, kinds, bodies, links, alpha: 1, held: null };
}

export function step(sim: Sim): void {
  const { bodies: p, s, W, H } = sim, n = p.length;
  const a = Math.max(sim.alpha, sim.held !== null ? 0.3 : 0);
  const push = 6000 * s * s, cap = 10 * s;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    let dx = p[j].x - p[i].x, dy = p[j].y - p[i].y;
    const d2 = dx * dx + dy * dy || 1, d = Math.sqrt(d2), f = Math.min(push / d2, cap) * a;
    dx /= d; dy /= d;
    p[i].vx -= dx * f; p[i].vy -= dy * f; p[j].vx += dx * f; p[j].vy += dy * f;
  }
  for (const { a: i, b: j, len } of sim.links) {
    const A = p[i], B = p[j];
    let dx = B.x - A.x, dy = B.y - A.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1, f = (d - len) * 0.03 * a;
    dx /= d; dy /= d;
    A.vx += dx * f; A.vy += dy * f; B.vx -= dx * f; B.vy -= dy * f;
  }
  // Pull harder along the short side so the web fills the box it's in.
  const kx = W >= H ? 0.004 : 0.006, ky = W >= H ? 0.006 : 0.004;
  const px = 40 * s, py = 30 * s;
  for (let i = 0; i < n; i++) {
    const q = p[i];
    if (i === sim.held) { q.vx = 0; q.vy = 0; continue; }
    // You stay near the middle; everything else is only nudged toward it.
    const k = sim.kinds[i] === 'me' ? 0.05 : 1;
    q.vx += (W / 2 - q.x) * (k === 1 ? kx : k) * a; q.vy += (H / 2 - q.y) * (k === 1 ? ky : k) * a;
    q.vx *= 0.82; q.vy *= 0.82; q.x += q.vx; q.y += q.vy;
    q.x = Math.max(px, Math.min(W - px, q.x)); q.y = Math.max(py, Math.min(H - py, q.y));
  }
  // Labels never sit on each other: overlapping nodes are moved apart.
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const [ri, hi] = ROOM[sim.kinds[i]], [rj, hj] = ROOM[sim.kinds[j]];
    const dx = p[j].x - p[i].x, dy = p[j].y - p[i].y;
    const ex = dx / (ri + rj), ey = dy / (hi + hj), e = Math.sqrt(ex * ex + ey * ey);
    if (e >= 1) continue;
    const m = e || 0.01, push = (1 - e) / 2;
    const ux = (ex || 0.01) / m, uy = ey / m;
    const sx = ux * (ri + rj) * push, sy = uy * (hi + hj) * push;
    if (i !== sim.held) { p[i].x -= sx; p[i].y -= sy; }
    if (j !== sim.held) { p[j].x += sx; p[j].y += sy; }
  }
  sim.alpha *= 0.99;
}

export function settle(sim: Sim, steps = 300): void {
  for (let k = 0; k < steps; k++) step(sim);
  sim.alpha = 0;
}

/** Fit the bodies into a new box, keeping their relative places. */
export function resize(sim: Sim, W: number, H: number): void {
  const fx = W / sim.W, fy = H / sim.H;
  for (const q of sim.bodies) { q.x *= fx; q.y *= fy; }
  sim.W = W; sim.H = H;
  sim.s = scale(W, H);
  for (const l of sim.links) l.len = l.base * sim.s;
}
