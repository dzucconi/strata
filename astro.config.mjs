import { defineConfig } from "astro/config";
import netlify from "@astrojs/netlify";

export default defineConfig({
  site: "https://strata.damonzucconi.com",
  adapter: netlify(),
  // Emit /123.html instead of /123/index.html so entry URLs stay `/123`.
  build: {
    format: "file",
  },
  trailingSlash: "never",
});
