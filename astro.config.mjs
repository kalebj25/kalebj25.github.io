import { defineConfig } from 'astro/config';

// A user site: served from the root of https://kalebj25.github.io
export default defineConfig({
  site: 'https://kalebj25.github.io',
  trailingSlash: 'always',
});
