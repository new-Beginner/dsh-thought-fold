# dsh-thought-fold

[![GitHub license](https://img.shields.io/github/license/new-Beginner/dsh-thought-fold)](https://github.com/new-Beginner/dsh-thought-fold/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/new-Beginner/dsh-thought-fold)](https://github.com/new-Beginner/dsh-thought-fold)

> DeepSeek Harness 的原生过程折叠与运行状态样式增强插件。
>
> v2.0.0 不再向模型注入任何指令，AI 的输出方式完全由模型与 DSH 自身配置决定。

## 功能

- 复用 DeepSeek Harness 自带的 `turn-process` / Compact Transcript 折叠机制。
- 使用非侵入式静态 CSS 优化原生过程折叠按钮和运行状态。
- 提供经典、极简、清晰三种折叠按钮外观。
- 在 DSH 设置中心提供简洁、响应式的“思考折叠”设置页。
- 提供 `/fold status`、`/fold toggle`、`/fold help` 指令。
- 任务完成后的实际折叠由 DSH 通用设置中的紧凑会话视图负责，插件不伪造或接管该行为。

## 安全边界

插件不会创建全局 `MutationObserver`，不会轮询或重写聊天 DOM，也不会清洗 `<think>` / `<thought>` 标签。插件仅设置一个根节点样式属性，让静态 CSS 根据启用状态与外观选项生效。

插件也不会注册 `systemPrompt` 段落，不依赖 `@deepseek-ai/dsh-system-prompt`，不会改变模型指令或输出习惯。

## 折叠设置

安装后建议在 DSH 的通用设置中将**会话记录视图（Transcript View）**设为**紧凑（Compact）**。DSH 会在任务完成后显示原生 `turn-process` 折叠按钮，将中间过程和工具调用收起。

## 安装

### 使用 DSH CLI（推荐）

```bash
# Desktop Profile
dsh plugin --profile desktop add github:new-Beginner/dsh-thought-fold

# Web Profile
dsh plugin --profile web add github:new-Beginner/dsh-thought-fold
```

安装完成后重启 DeepSeek Harness。

### 手动配置 Profile

```json
{
  "dependencies": {
    "dsh-thought-fold": "github:new-Beginner/dsh-thought-fold"
  },
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

## 配置

```yaml
dsh-thought-fold:
  enabled: true
  showLiveHud: true
  foldStyle: codex # codex | minimal | clean
```

旧版本遗留的提示相关配置与 `autoFold` 字段会被忽略；实际折叠由 DSH 的紧凑会话视图控制。

## 指令

- `/fold status`：查看插件、自动折叠和外观状态。
- `/fold toggle`：快速开启或关闭插件。
- `/fold help`：显示帮助。

## 验证

```bash
npm test
npm run pack:plugin
```

自动化测试会检查：

- 不存在模型指令注入路径与相关依赖；
- 不存在全局 DOM 观察、聊天轮询或 `innerHTML` 重写；
- Client 重复装载不会重复注入样式；
- 三种外观配置能同步到运行时根节点；
- 设置页包含响应式布局、键盘焦点与主题安全下拉框。

## License

MIT
