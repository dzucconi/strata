# strata

[![Netlify Status](https://api.netlify.com/api/v1/badges/b3ee12fb-a8f3-415f-ab55-aea1b6d61425/deploy-status)](https://app.netlify.com/sites/damonzucconi-strata/deploys)

## Local development

Requires Node.js 18 or newer.

```sh
yarn install
yarn start
```

This fetches the complete collection, generates the local static data, starts
Parcel, and opens the site in a browser.

To test the same production build that Netlify publishes:

```sh
yarn build
yarn preview
```

The preview command prints the local URL to open.

## Meta

- **State**: production
- **Production**:
  - **URL**: https://strata.damonzucconi.com/
  - **URL**: https://damonzucconi-strata.netlify.app/
- **Host**: https://app.netlify.com/sites/damonzucconi-strata/overview
- **Deploys**: Merged PRs to `dzucconi/strata#master` are automatically deployed to production. [Manually trigger a deploy](https://app.netlify.com/sites/damonzucconi-strata/deploys)
