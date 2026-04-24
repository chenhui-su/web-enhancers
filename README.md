# Web Enhancers

`web-enhancers` 是一个面向用户脚本和网页增强插件的 TypeScript monorepo 模板。它用于把单文件脚本逐步演进为可维护、可测试、可发布的工程化插件。

## 快速开始

```bash
npm install
npm run check
npm run build:page
```

构建后的 userscript 文件位于：

```text
packages/page-enhancer/dist/page-enhancer.user.js
```

可将该文件安装到 Tampermonkey、Violentmonkey 等用户脚本管理器中。

## 仓库结构

```text
packages/
  common/              跨插件共享类型与工具函数
  page-enhancer/       示例用户脚本插件
scripts/               构建与脚手架脚本
docs/                  开发文档
.github/workflows/     CI 与发布自动化示例
```

## 插件架构

每个插件建议采用以下分层：

```text
src/
  constants/           常量、默认配置、纯数据
  services/            存储、样式注入、观察者、通信等副作用封装
  features/            业务逻辑与页面增强行为
  ui/                  插件自有 DOM、事件委托、状态同步
  index.ts             初始化编排、错误边界、生命周期清理
```

核心原则：增强而非劫持。优先使用 CSS 变量、数据属性和非侵入式选择器，避免直接破坏宿主页面结构。

## 常用命令

`npm run build:page` 构建示例插件。

`npm run dev:page` 监听示例插件变更并自动重建。

`npm run build:all` 构建除 `common` 外的所有插件包。

`npm run lint` 运行 ESLint。

`npm run typecheck` 运行 TypeScript 类型检查，不输出文件。

`npm run test` 运行 Vitest 单元测试。

`npm run check` 依次运行 lint、typecheck、test、build。

## 创建新插件

```bash
npx tsx scripts/new-plugin.ts my-plugin
```

然后在 `package.json` 中按需添加快捷命令：

```json
{
  "scripts": {
    "build:my-plugin": "tsx scripts/build.ts my-plugin",
    "dev:my-plugin": "tsx scripts/build.ts my-plugin --watch"
  }
}
```

新插件需要优先更新 `packages/<plugin>/userscript.meta.js` 中的 `@name`、`@namespace`、`@match`、`@grant` 等元数据。

## 构建说明

构建流程由 `scripts/build-plugin.ts` 统一实现：

1. 使用 esbuild 将 TypeScript 入口打包为单文件 IIFE。
2. 读取插件目录下的 `userscript.meta.js`。
3. 将元数据头拼接到打包代码前方。
4. 输出 `packages/<plugin>/dist/<plugin>.user.js` 和 sourcemap。

## 发布与自动更新

仓库通过 GitHub Release 发布 userscript。推送形如 `<plugin>@<version>` 的 tag 后，`.github/workflows/release.yml` 会自动执行：

1. 解析 tag 得到插件名和版本号。
2. 校验 `userscript.meta.js` 中的 `@version`、`@updateURL`、`@downloadURL`。
3. 构建目标插件。
4. 创建 GitHub Release，并上传 `<plugin>.user.js` 和 sourcemap。

以 `page-enhancer` 为例，发布命令为：

```bash
git tag page-enhancer@0.1.0
git push origin page-enhancer@0.1.0
```

Tampermonkey 自动更新依赖两个元数据字段：

```text
@updateURL    https://raw.githubusercontent.com/chenhui-su/web-enhancers/main/packages/page-enhancer/userscript.meta.js
@downloadURL  https://github.com/chenhui-su/web-enhancers/releases/download/page-enhancer@0.1.0/page-enhancer.user.js
```

发布新版本前，需要同步修改 `@version` 和 `@downloadURL` 中的 tag 版本。CI 会阻止版本不一致的 release。

## 版本号规范

插件版本号统一使用 `x.y.z` 格式，并与 `userscript.meta.js` 中的 `@version` 保持一致。

`x` 表示重大更新，例如大规模重构、引入影响较大的架构机制、配置迁移或可能改变用户既有使用方式的更新。

`y` 表示明显的功能更新，例如新增用户可感知的设置项、增强模块、发布渠道或主要交互能力。

`z` 表示问题修复，例如样式覆盖修复、兼容性修复、构建修复、文案修正或不改变功能边界的小调整。

发布 tag 必须使用 `<plugin>@<version>` 格式，例如：

```text
gemini-ui-enhancer@1.0.3
```

## 质量要求

提交前至少运行：

```bash
npm run check
```

新增通用工具函数时，应在 `packages/common` 中补充 Vitest 单元测试。涉及 DOM 行为的插件功能，应优先保持逻辑小而清晰，必要时再引入端到端测试。

## AI 维护约定

本仓库后续会使用 AI 辅助维护。AI 或自动化代理在修改代码时必须遵守：

- 先阅读相关代码和文档，再做最小必要修改。
- 不提交 `node_modules`、`dist`、coverage、临时文件或本地配置。
- 不修改无关文件，不回滚用户已有变更。
- 改动插件代码后运行 `npm run check`，如无法运行需说明原因。
- 所有 DOM ID、class、storage key、CSS 变量必须带插件前缀。
- 用户脚本元数据只放在 `userscript.meta.js`，运行时代码只放在 `src`。

更详细的 AI 协作规则见 `AGENTS.md` 和 `.github/copilot-instructions.md`。
