# Page Enhancer Template

This package is a minimal userscript plugin demonstrating the recommended layered pattern.

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

Before using it on a real site, update `userscript.meta.js`, especially `@match`, `@name`, `@namespace`, and grants.
