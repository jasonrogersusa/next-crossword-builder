# Neural Mini AI Crossword

A playable AI-themed mini crossword built with Next.js. The app starts by asking
which area of tech the player is interested in, then serves a denser 9x9
crossword for that topic.

## Local Development

```bash
npm install
npm run dev
```

## Validate the Current App Build

```bash
npm test
```

The default build still uses the existing Vinext/Sites runtime:

```bash
npm run build
```

## GitHub Pages

This repository includes a GitHub Actions workflow at
`.github/workflows/github-pages.yml`.

On every push to `main`, the workflow:

1. Installs dependencies with `npm ci`
2. Runs `npm run build:github`
3. Uploads the static `out/` export
4. Deploys it to GitHub Pages

To test the same static export locally:

```bash
npm run build:github
```

For a project Pages URL such as
`https://jasonrogersusa.github.io/next-crossword-builder/`, the workflow sets
the correct base path automatically from `GITHUB_REPOSITORY`.

In GitHub, make sure Pages is set to deploy from **GitHub Actions**:

`Settings` -> `Pages` -> `Build and deployment` -> `Source: GitHub Actions`
