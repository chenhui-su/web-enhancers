# Page Enhancer

This package is a lightweight userscript package in the monorepo. It serves as a simple page enhancement implementation and a reference for the repository's layered structure.

## Features

- Config persistence through `ConfigManager`
- Runtime theme injection through CSS variables and `GM_addStyle`
- Debounced `MutationObserver`
- Delegated panel events
- Cleanup on `beforeunload`

## Build

```bash
npm run build:page
```

Install `packages/page-enhancer/dist/page-enhancer.user.js` in Tampermonkey or Violentmonkey.

When adapting it to a real site, update `userscript.meta.js`, especially `@match`, `@name`, `@namespace`, and grants.
