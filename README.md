# strata

[![Netlify Status](https://api.netlify.com/api/v1/badges/b3ee12fb-a8f3-415f-ab55-aea1b6d61425/deploy-status)](https://app.netlify.com/sites/damonzucconi-strata/deploys)

## How it works

The site is built with [Astro](https://astro.build) and hosted on Netlify.
Pages and the RSS feed are rendered on demand from the Auspices GraphQL API
and cached at the CDN for five minutes with stale-while-revalidate. Search
runs in a Web Worker against JSON embedded in the index; the feed is at
[`/rss.xml`](https://strata.damonzucconi.com/rss.xml).

## Local development

Requires Node.js 20 or newer.

```sh
yarn install
yarn dev
```

This starts the Astro dev server and opens the site in a browser. TypeScript
and Sass changes update automatically with hot module reloading.

## Meta

- **State**: production
- **Production**:
  - **URL**: https://strata.damonzucconi.com/
  - **URL**: https://damonzucconi-strata.netlify.app/
- **Host**: https://app.netlify.com/sites/damonzucconi-strata/overview
- **Deploys**: Merged PRs to `dzucconi/strata#master` are automatically deployed to production. [Manually trigger a deploy](https://app.netlify.com/sites/damonzucconi-strata/deploys)
