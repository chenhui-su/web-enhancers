# Copilot / AI Instructions

This repository is a TypeScript monorepo for userscripts and webpage enhancer plugins. Respond in Chinese by default when editing documentation or explaining changes to the maintainer.

## Architecture

Each plugin lives in `packages/<plugin>` and should keep runtime code under `src`:

- `constants`: pure constants and default config.
- `services`: side effects such as storage, style injection, observers, and communication.
- `features`: domain behavior for enhancing pages.
- `ui`: plugin-owned DOM, delegated events, and state sync.
- `index.ts`: initialization orchestration, error boundary, and lifecycle cleanup.

Shared, site-agnostic code belongs in `packages/common/src`.

## Rules

- Prefer the smallest correct change.
- Do not introduce frameworks or large abstractions unless explicitly requested.
- Do not edit generated output in `packages/*/dist`.
- Do not commit dependencies, logs, coverage, local environment files, or secrets.
- Keep userscript metadata in `userscript.meta.js`; keep runtime source in `src`.
- Prefix DOM IDs, classes, storage keys, and CSS variables with the plugin ID.
- For dynamic pages, use debounced observers and duplicate-processing guards.
- Ensure observers, timers, and listeners have cleanup paths.

## Validation

Run `npm run check` after code changes. If validation cannot be run, document the reason and the expected risk.

Use Conventional Commits for commit messages.
