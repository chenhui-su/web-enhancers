# New Plugin Guide

1. Run `npx tsx scripts/new-plugin.ts <plugin-name>`.
2. Update `packages/<plugin-name>/userscript.meta.js`.
3. Add layered folders under `src` as the plugin grows.
4. Add `build:<plugin-name>` and `dev:<plugin-name>` scripts if you want shortcuts.
5. Keep shared, site-agnostic utilities in `packages/common/src`.

Start with the smallest working userscript, then extract constants, services, features, and UI modules only when the file starts mixing responsibilities.
