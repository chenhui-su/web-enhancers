# Architecture

The repository uses a small monorepo layout for independent userscript plugins plus a shared `common` package.

## Layers

Core code contains constants, config shape, and pure helpers. It must not depend on DOM state.

Service code wraps side effects such as storage, injected styles, observers, and cross-context communication.

Domain code implements page enhancement behavior and should depend on services rather than global state where practical.

UI code creates plugin-owned DOM, binds delegated events, and syncs with service state.

Entry code wires dependencies, applies error boundaries, starts observers, and registers cleanup.

## Rules

- Prefix storage keys, DOM classes, DOM IDs, and CSS variables with the plugin ID.
- Keep metadata in `userscript.meta.js` and source in `src`.
- Prefer small, direct modules over framework-like abstractions.
- Do not mutate host page structure unless CSS or attributes are insufficient.
- Every observer, timer, and listener needs an owner and cleanup path.
