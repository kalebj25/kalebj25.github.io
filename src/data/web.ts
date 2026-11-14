// The web's nodes and lines, built from the project list.
import { projects, ideas, ideaLinks, href } from './projects';
import type { Kind } from '../scripts/physics';

export interface WebNode {
  id: string; label: string; kind: Kind;
  color?: string; href?: string; kindLabel?: string; line?: string; ground?: string; ink?: string;
}

export function buildWeb(): { nodes: WebNode[]; edges: [number, number][] } {
  const nodes: WebNode[] = [{ id: 'me', label: 'Kaleb', kind: 'me' }];
  for (const p of projects) {
    nodes.push({
      id: p.slug, label: p.name, kind: p.next ? 'next' : 'project', color: p.dot ?? p.ground,
      href: href(p), kindLabel: p.kind, line: p.line, ground: p.ground, ink: p.ink,
    });
  }
  for (const t of ideas()) nodes.push({ id: `idea:${t}`, label: t, kind: 'idea' });
  const at = new Map(nodes.map((n, i) => [n.id, i]));
  const edges: [number, number][] = [];
  for (const p of projects) {
    edges.push([0, at.get(p.slug)!]);
    for (const t of p.ideas) edges.push([at.get(p.slug)!, at.get(`idea:${t}`)!]);
  }
  for (const [a, b] of ideaLinks) edges.push([at.get(`idea:${a}`)!, at.get(`idea:${b}`)!]);
  return { nodes, edges };
}
