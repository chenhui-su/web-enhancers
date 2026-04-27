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

## 页面结构参考

Gemini 当前至少存在两种主要页面模式，维护时不要混用同一套布局假设：

- 首页 / zero-state：`https://gemini.google.com/app`
- 会话页 / conversation-state：`https://gemini.google.com/app/<conversation-id>`

### 首页关键节点

- `main.chat-app`
- `bard-sidenav`
- `fieldset.input-area-container.is-zero-state`
- `div.input-area`

首页输入框当前依赖宿主页面的绝对定位：

- `.input-area-container.is-zero-state`
- `position: absolute`
- `bottom: 50vh`
- `transform: translate(-50%, 50%)`

因此首页布局调整应只命中 `is-zero-state`，不要直接复用会话页输入框规则。

### 会话页关键节点

- `main.chat-app`
- `div.conversation-container`
- `div.response-container`
- `fieldset.input-area-container`
- `span.user-query-container`
- `div.query-content`
- `span.user-query-bubble-with-background`
- `structured-content-container.model-response-text`

当前会话页正文的真实层级大致为：

```text
.conversation-container
  .user-query-container
    .query-content
      .action-button-container
      .action-button-container
      .user-query-bubble-with-background

.response-container
  .presented-response-container
    structured-content-container.model-response-text
      .container
        message-content
          .markdown.markdown-main-panel
```

### 关键维护约定

- 输入框布局分成首页模式和会话模式分别处理。
- 用户消息操作按钮实际节点是 `.action-button-container`，不是 `.message-actions`。
- 用户消息气泡宽度问题优先看 `.query-content` 和 `.user-query-bubble-with-background` 的实际布局，不要只改文字节点。
- 侧边栏标题、分组标题和会话标题要单独看，不要用过宽的图标隔离选择器。
- 公式当前使用 KaTeX，关键节点通常是 `.math-inline`、`.math-block`、`.katex`、`.katex-display`。
- 代码块需要显式等宽字体栈，不要依赖 `initial`。

### 字体策略

当前脚本采用“模块白名单”而不是全局 `span/div` 覆盖：

- 模型回复正文单独覆盖
- 用户消息单独覆盖
- 输入框单独覆盖
- 侧边栏和顶部标题单独覆盖
- 公式和图标单独隔离

后续若发现新的字体污染问题，应优先新增更具体的模块选择器，而不是恢复大范围通配规则。

### 调试建议

遇到样式问题时，优先抓这些信息：

- 目标元素 `outerHTML`
- `getComputedStyle()` 的 `font-family`、`display`、`position`、`width`、`padding`、`margin`
- 命中的 CSS 规则来源

如果需要重新采样 DOM，可优先关注：

- `main.chat-app`
- `bard-sidenav`
- `.conversation-container`
- `.response-container`
- `.input-area-container`
- `.query-content`
- `.user-query-bubble-with-background`
- `.model-response-text`
- `.katex`
- `pre`
