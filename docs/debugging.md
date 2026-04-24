# Debugging

## Local Install

Build the plugin, then install the generated `.user.js` file from the package `dist` folder in Tampermonkey or Violentmonkey.

## Logging

Use `createLogger(pluginId, () => config.debug)` from `packages/common`. Production logs stay silent unless debug mode is enabled.

## Common Issues

Host styles can override plugin styles. Use plugin-scoped selectors, CSS variables, and `!important` only where the host page is likely to fight back.

Dynamic pages can remove enhanced DOM. Use a debounced observer and mark processed nodes with a plugin-prefixed data attribute or `WeakSet`.

External resources can fail. Fonts, stylesheets, and fetch calls should have local fallbacks and `catch` paths.
