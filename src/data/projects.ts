// The one list the whole site is built from. Adding a project (robotics, once it
// has a name) means adding one entry here: it gets a node in the web, a card on
// the bench and its own page. Text in [brackets] is placeholder copy, said so on
// purpose; replace it rather than designing around it.

export interface Project {
  slug: string;
  name: string;
  no: string;
  kind: string;
  status: string;
  line: string;
  image: string;
  /** Page colors: the field, the text on it, and the accent. */
  ground: string;
  ink: string;
  accent: string;
  /** Its dot in the web, when the field color won't read on paper. */
  dot?: string;
  /** The ideas it's made of; these draw the lines in the web. */
  ideas: string[];
  /** Not started yet: drawn dashed in the web. */
  next?: boolean;
  /** A logo to show in place of the name on its page. */
  logo?: { src: string; width: number; height: number };
}

export const projects: Project[] = [
  {
    slug: 'ergo', name: 'ERGO', no: 'No. 01', kind: 'Software', status: 'Running',
    line: 'A local-first AI orchestrator on my own hardware, with memory, tools and a family of agents.',
    image: 'ERGO, its interface',
    ground: '#7E1724', ink: '#F7EDE6', accent: '#F2B8A8',
    ideas: ['AI', 'Local-first', 'Memory', 'Agents', 'Product'],
  },
  {
    slug: 'lacuna', name: 'LACUNA', no: 'No. 02', kind: 'Prints · AI', status: 'In progress…',
    line: 'A future 3D printing brand for the things in between, and a sibling AI in the ERGO family.',
    image: 'a first print',
    ground: '#0E3836', ink: '#E2F2EE', accent: '#8FD3C4',
    ideas: ['3D printing', 'Making', 'Design', 'Agents'],
  },
  {
    slug: 'btwn-the-dots', name: 'Btwn the Dots', no: 'No. 03', kind: 'Art · Clothing', status: '[status]',
    line: '[Your words: the art, and the clothing it becomes]',
    image: 'a Btwn the Dots piece',
    ground: '#1C2754', ink: '#ECEBF7', accent: '#AFB6F0',
    ideas: ['Color', 'Design', 'Making'],
  },
  {
    // RENDER keeps its own colors and logo: white, black, cardinal crimson #c41e3a.
    slug: 'render', name: 'RENDER', no: 'No. 04', kind: 'Food', status: '[status]',
    line: 'Fusion food over charcoal: BBQ meets Latin, Thai and Japanese.',
    image: 'a RENDER plate',
    ground: '#FFFFFF', ink: '#131111', accent: '#C41E3A', dot: '#C41E3A',
    ideas: ['Charcoal', 'Fusion', 'Making'],
    logo: { src: '/render/render-logo.png', width: 3121, height: 1166 },
  },
  {
    slug: 'robotics', name: 'Robotics', no: 'No. 05', kind: 'Next', status: 'Coming…',
    line: 'What comes next. The name comes later.',
    image: 'coming soon',
    ground: '#2A2A2C', ink: '#EDEDEE', accent: '#B9B9BE',
    ideas: ['AI', 'Making', '3D printing'],
    next: true,
  },
];

/** Lines between ideas themselves, beyond the ones projects draw. */
export const ideaLinks: [string, string][] = [['Agents', 'Asimov']];

export function ideas(): string[] {
  const all = new Set<string>();
  for (const p of projects) p.ideas.forEach((t) => all.add(t));
  for (const [a, b] of ideaLinks) { all.add(a); all.add(b); }
  return [...all];
}

/** Other projects that share an idea with this one. */
export function kin(p: Project): { project: Project; via: string[] }[] {
  return projects
    .filter((q) => q.slug !== p.slug)
    .map((q) => ({ project: q, via: q.ideas.filter((t) => p.ideas.includes(t)) }))
    .filter((k) => k.via.length > 0);
}

export const href = (p: Project) => `/work/${p.slug}/`;
