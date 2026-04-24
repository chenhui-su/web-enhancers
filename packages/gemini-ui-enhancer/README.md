# Gemini UI Enhancer

Gemini 网页端界面增强 userscript。

当前包先承载从单文件脚本迁移过来的可构建版本，后续维护应逐步将 `src/legacy.js` 拆分到 `constants/`、`services/`、`features/`、`ui/` 和 `index.ts`。

## 构建

```bash
npx tsx scripts/build.ts gemini-ui-enhancer
```

输出文件：

```text
packages/gemini-ui-enhancer/dist/gemini-ui-enhancer.user.js
```
