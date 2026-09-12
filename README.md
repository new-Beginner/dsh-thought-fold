# dsh-thought-fold

[![GitHub license](https://img.shields.io/github/license/new-Beginner/dsh-thought-fold)](https://github.com/new-Beginner/dsh-thought-fold/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/new-Beginner/dsh-thought-fold)](https://github.com/new-Beginner/dsh-thought-fold)
[![recommended by: dshfind](https://img.shields.io/badge/recommended%20by-dshfind-FFD700?style=flat-square)](https://dshfind.com)
[![1024Store](https://img.shields.io/badge/1024Store-cataloged-blue?style=flat-square)](https://deepseek1024.com)

> DeepSeek Harness 的 Codex 风格**可见执行进度**与**原生过程折叠**增强插件。  
> v1.0.1 是白屏安全修复版：移除了所有全局 DOM 监听、消息节点重写和 `<think>` 标签清洗逻辑。

## 功能

- 向外部模型注入简短的阶段进度规范：开始工具操作前说明下一步，阶段切换时报告关键发现。
- 要求模型在全部工具调用结束后输出完成总结、关键文件和验证结果。
- 复用 DeepSeek Harness 自带的 `turn-process` / Compact Transcript 折叠机制。
- 使用非侵入式静态 CSS 增强 DSH 原生过程折叠按钮的 Codex 风格外观。
- 在 DSH 设置中心提供“Codex 思考与折叠”页面。
- 提供 `/fold status`、`/fold toggle`、`/fold reload`、`/fold help` 指令。

## v1.0.1 白屏修复

v1.0.0 会在整个 `document.body` 上创建 `MutationObserver`，其回调又会重写聊天节点的 `innerHTML`。DOM 改动会再次触发观察器，形成无休止的扫描和渲染循环，最终导致 Desktop 卡死或白屏。

v1.0.1 已完成以下修复：

- 删除全局 `MutationObserver`；
- 删除聊天轮次 `querySelectorAll` 轮询；
- 删除所有消息 `innerHTML` 重写；
- 删除 `<think>` / `<thought>` 原地清洗；
- 删除 Client 模块加载阶段的自动执行逻辑；
- 将 Host 设置 Schema 恢复为官方插件使用的静态 `@deepseek-ai/schemastery` 导入；
- 折叠交互完全交由 DSH 自带的 Compact Transcript 管理。

## 折叠设置

安装后请在 DSH 的通用设置中将**会话记录视图（Transcript View）**设置为**紧凑（Compact）**。DSH 会在任务完成后显示原生 `turn-process` 折叠按钮，将中间进度消息和工具调用收起，并保留最后的总结。

> 插件不会尝试获取或展示模型未通过 API 返回的私密内部推理链。它展示的是模型明确输出的 reasoning 摘要或面向用户的阶段进度更新。

## 安装

### 方式一：直接通过 GitHub 安装

在 Desktop Profile `~/.dsh/profiles/desktop/package.json` 的 `dependencies` 中添加：

```json
{
  "dsh-thought-fold": "github:new-Beginner/dsh-thought-fold"
}
```

然后在 `dsh.profile.bundles` 中添加：

```json
"dsh-thought-fold"
```

### 方式二：使用预打包本地安装包

下载或生成 `dsh-thought-fold-1.0.1.tgz` 后，在 `~/.dsh/profiles/desktop/package.json` 的 `dependencies` 中添加：

```json
{
  "dsh-thought-fold": "file:./dsh-thought-fold-1.0.1.tgz"
}
```

并在 `dsh.profile.bundles` 中添加 `"dsh-thought-fold"`。

### 完整 Profile 片段示例

```json
{
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-thought-fold"
      ]
    }
  }
}
```

重启 DeepSeek Harness Desktop 后生效。

## 配置

```yaml
dsh-thought-fold:
  enabled: true
  autoFold: true
  showLiveHud: true
  injectPrompt: true
  promptStyle: standard   # standard | concise | deep
  foldStyle: codex
  hideRawThinkTag: false  # 安全版不修改聊天 DOM
  promptPosition: after-persona
```

## 验证

```bash
npm test
npm run pack:plugin
```

测试包含白屏回归守卫，确保 Client 代码中不存在：

- `new MutationObserver(...)`
- `.innerHTML = ...`
- 全局聊天轮次轮询
- `document.body` 监听/改写
- Host 顶层动态 `await import(...)`

## License

MIT
