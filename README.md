# kalebj25.github.io

Kaleb Jackson's personal site: a living resume, and the work and ideas behind it.
Built with [Astro](https://astro.build) and published to GitHub Pages by
`.github/workflows/deploy.yml` on every push to `main`.

- `src/data/projects.ts`: the one list every page is built from. Add a project here
  and it gets a node in the web, a card on the bench and its own page.
- `src/components/Web.astro` and `src/scripts/physics.ts`: the web on the front page.
  It's laid out at build time, so it reads without JavaScript, then the browser animates it.
- `src/pages/work/[slug].astro`: a project page.

```sh
npm ci --ignore-scripts
npm run dev     # http://localhost:4321
npm test        # build, check links, then layout in WebKit (needs: npx playwright install webkit)
```

Text in [brackets] is placeholder copy.
