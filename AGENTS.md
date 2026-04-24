# AI 维护指南

本仓库面向用户脚本和网页增强插件开发。AI 代理在维护本仓库时，应优先保证插件行为稳定、代码可读、变更范围可控。

## 工作原则

- 先理解现有结构，再修改代码。
- 默认做最小正确变更，不引入不必要的抽象、框架或兼容层。
- 不回滚、不覆盖用户或其他代理已有变更，除非用户明确要求。
- 不提交 `node_modules`、`packages/*/dist`、coverage、日志、临时文件、密钥或本地 IDE 配置。
- 不把密钥写入仓库。发布凭据应使用 GitHub Secrets。

## 代码组织

插件代码应遵循以下分层：

- `constants/`：常量、默认配置、纯数据，无 DOM 副作用。
- `services/`：存储、样式、观察者、通信等副作用封装。
- `features/`：页面增强业务逻辑。
- `ui/`：插件自有 UI、事件委托、状态同步。
- `index.ts`：初始化编排、错误边界、生命周期清理。

跨插件共享能力放入 `packages/common/src`。站点特定逻辑不要放入 `common`。

## 用户脚本约束

- `userscript.meta.js` 只维护元数据头。
- 打包入口统一为 `packages/<plugin>/src/index.ts`。
- 所有 DOM ID、class、storage key、CSS 变量必须使用插件前缀。
- 动态页面增强应使用防抖后的 `MutationObserver`，并通过 `WeakSet` 或数据属性避免重复处理。
- 注入样式必须限定作用域，必要时使用 `!important` 抵抗宿主页面覆盖。
- 任何 observer、timer、事件监听器都需要明确 cleanup 路径。

## 验证要求

修改代码后优先运行：

```bash
npm run check
```

如果只改文档，可不运行完整检查，但应说明未运行原因。

## 提交信息

使用 Conventional Commits 风格：

```text
feat: add page enhancer scaffold
fix: avoid duplicate DOM enhancement
docs: translate repository README
chore: configure AI maintenance rules
```

提交前确认 `git status --short`，避免混入无关文件。
