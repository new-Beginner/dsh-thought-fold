<div align="center">

# dsh-thought-fold

**为 DeepSeek Harness 提供可靠、克制、可恢复的思考与工具过程折叠体验**

让长任务更易阅读，让中途插话和中断过程保持清晰，同时不改变模型指令、回答内容或宿主会话数据。

[![Release](https://img.shields.io/github/v/release/new-Beginner/dsh-thought-fold?display_name=tag&sort=semver)](https://github.com/new-Beginner/dsh-thought-fold/releases/latest)
[![License](https://img.shields.io/github/license/new-Beginner/dsh-thought-fold)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white)](package.json)
[![Tests](https://img.shields.io/badge/tests-114%20passed-2ea44f)](VERIFICATION.md)
[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek%20Harness-plugin-4f6ef7)](https://github.com/new-Beginner/dsh-thought-fold)

[功能优势](#features) · [2.2.0 更新](#release-220) · [安装](#installation) · [配置](#configuration) · [验证](#quality)

</div>

> [!NOTE]
> 当前稳定版本为 **v2.2.0**。本版本新增中途插话分段与中断过程折叠，并完整保留 v2.1.0 的底部收起、浮动收起和历史会话兼容能力。

<a id="features"></a>

## ✨ 功能优势

| 阅读体验与任务控制 | 安全性与宿主兼容 |
| :--- | :--- |
| **🧠 长过程更易阅读**<br><br>• 已完成的思考与工具调用默认收起<br>• 用户消息、最终回答与关键提示始终保留<br>• 长会话不再被大量过程记录淹没<br>• 需要追溯时可随时展开完整过程 | **✂️ 插话自动分段**<br><br>• `user` 与 `steering` 插话天然成为边界<br>• 插话前后的过程可独立展开或收起<br>• 连续插话不会制造空白过程组<br>• 浮动入口明确标注轮次和段号 |
| **↩️ 状态稳定且可恢复**<br><br>• 重绘、滚动和输入区变化不重置手动选择<br>• 原生与兼容模式切换时保留展开状态<br>• 停用、切换会话或卸载时撤销显示标记<br>• 不模拟点击改变分段前的原生开合状态 | **🛡️ 宁可不折叠，也不误隐藏**<br><br>• 只依据宿主的轮次、步骤和工具结算状态<br>• 边界不完整或状态不可靠时保持原样可见<br>• 不靠文本猜测“最终回答”或“任务结束”<br>• 网络、审批和重试等待不会被误判为中断 |
| **⚡ 轻量且可控**<br><br>• 仅观察当前会话，不监听整个 `document.body`<br>• 使用动画帧合并更新，不轮询聊天内容<br>• 输入区增高、窗口缩放和滚动时自适应定位<br>• 生命周期结束后完整清理自有资源 | **🔌 原生集成，不侵入会话**<br><br>• 不向模型注入系统提示或额外指令<br>• 不修改消息文本、会话记录和回答内容<br>• 不移动或重包裹 React 管理的消息行<br>• 原生控件可用时优先复用 DSH 原生状态 |

<a id="release-220"></a>

## 🚀 2.2.0 更新重点

### 插话过程独立成段

已进入聊天流的用户补充或 steering 消息会保留在过程组之外，并作为可靠分段边界：

```text
过程第 1 段 → 用户插话 → 过程第 2 段 → 最终回答
    可独立收起             可独立收起       始终保留
```

- 运行中的轮次只收起**已经明确结束**的前段。
- 尚未完成的前段、仍在执行的尾段保持可见。
- 排队中但尚未进入聊天流的插话不会提前触发分段。
- 多次插话形成多个稳定段，各段的手动展开状态互不影响。

### 中断过程也能安全整理

当宿主确认轮次已经结束且边界可靠时，即使没有标准最终回答锚点，也可以整理被停止、报错或达到长度限制的过程：

- 保留最后一段已输出的非空正文。
- 保留用户消息、停止提示、错误提示和长度限制提示。
- 不把断网等待、审批等待或暂时无输出误判为中断。
- 只有一个独立思考块时继续使用原生顶部控件，不重复增加过程组。

### 三种互补的收起入口

| 入口 | 使用场景 | 行为 |
| --- | --- | --- |
| 原生顶部入口 | DSH 原生过程组可用时 | 保持宿主原生状态和交互 |
| 底部“收起本段过程” | 已展开过程的底部在视野内 | 只收起当前轮次或当前分段 |
| 输入区上方浮动入口 | 过程底部离开视野或被输入区遮挡 | 自动选择当前正在阅读的过程段，且全局只显示一个 |

浮动按钮会随滚动、窗口宽度和输入区高度变化重新定位，不覆盖输入区域；当底部入口可见时不会重复出现。

<a id="installation"></a>

## 📦 安装与更新

### 方式一：下载 Release 安装包

从 [GitHub Releases](https://github.com/new-Beginner/dsh-thought-fold/releases/latest) 下载：

```text
dsh-thought-fold-2.2.0.tgz
```

也可以使用 [v2.2.0 直接下载链接](https://github.com/new-Beginner/dsh-thought-fold/releases/download/v2.2.0/dsh-thought-fold-2.2.0.tgz)。

在 DSH 插件管理界面中选择该安装包完成安装。建议保留旧版本安装包，以便需要时回退。

### 方式二：通过 GitHub 仓库安装

```bash
# Desktop Profile
dsh plugin --profile desktop add github:new-Beginner/dsh-thought-fold

# Web Profile
dsh plugin --profile web add github:new-Beginner/dsh-thought-fold
```

> [!IMPORTANT]
> 安装或更新后请重启 DSH。项目构建不会自动替换已安装插件，也不会自动更新当前打开的页面。

<a id="configuration"></a>

## ⚙️ 配置与指令

### 配置示例

```yaml
dsh-thought-fold:
  enabled: true
  showLiveHud: true
  foldStyle: codex # codex | minimal | clean
```

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `enabled` | `true` | 启用过程折叠、底部入口和浮动入口 |
| `showLiveHud` | `true` | 增强原生过程控件及插件按钮的视觉表现；关闭后不影响折叠能力 |
| `foldStyle` | `codex` | 选择 `codex`、`minimal` 或 `clean` 三种按钮风格 |

配置键与 2.0.0 保持兼容，旧版提示注入字段会被忽略。设置中心的“思考折叠”修改可以即时生效。

### 可用指令

| 指令 | 作用 |
| --- | --- |
| `/fold status` | 查看插件、运行状态样式和按钮风格 |
| `/fold toggle` | 持久化开启或关闭插件 |
| `/fold help` | 显示指令帮助 |

建议继续开启 DSH 的“紧凑会话视图”。在标准模式或历史内容未完整加载、原生按钮暂不可用时，插件会在边界可靠的前提下启用兼容折叠，不会擅自修改宿主通用设置。

## 🔒 稳定性与兼容原则

1. **不改内容**：不改写消息文本、模型输出或会话记录。
2. **不猜边界**：缺少可靠轮次、步骤或工具结算元数据时保持内容可见。
3. **不破坏原生状态**：原生折叠可用时以宿主状态为准；分段接管是纯显示且可撤销的。
4. **不全局扫描**：只监听当前会话作用域，并通过动画帧合并更新。
5. **不遗留副作用**：会话切换、停用和卸载都会清理插件自有资源并恢复显示属性。
6. **支持浏览器查找揭示**：兼容隐藏采用 `hidden="until-found"`，响应 `beforematch` 后恢复整组可见。
7. **无障碍友好**：按钮包含明确的展开/收起、轮次和段号标签，并提供可见焦点样式。

当前兼容路径依赖 DSH 提供 `conversation.composer.dock`、`useChat` 节点/时间线数据，以及 `data-chat-flow`、`data-chat-turn`、`data-composer-seat` 等聊天标记。如果宿主版本缺少这些能力或页面结构无法识别，插件会安全退回原始显示，不尝试重写整页。

<a id="quality"></a>

## ✅ 质量与验证

v2.2.0 在正式发布前完成了自动化、集成与真实浏览器回归：

| 验证范围 | 结果 |
| --- | ---: |
| Node.js 自动化测试 | **77 项通过** |
| 项目集成检查 | **8 / 8 通过** |
| Edge Headless + React 18 浏览器回归 | **37 项通过** |
| 浏览器页面错误 | **0** |
| 合计测试 | **114 项通过** |

浏览器回归覆盖历史会话、延迟补载、原生/兼容模式切换、插话分段、中断轮次、浮动定位、焦点与滚动保持、`beforematch`、设置生命周期、停用和卸载清理等关键路径。

完整验证明细、限制和安装后验收建议见 [`VERIFICATION.md`](VERIFICATION.md)。

## 🧩 技术实现

```text
src/client-entry.js   设置页面、视觉样式与客户端生命周期
src/fold-runtime.js   会话作用域、原生/兼容折叠、浮动定位与可撤销接管
src/process-plan.js   仅接收自有标量数据的分段和中断边界规划器
scripts/build-client.js
                      零额外构建依赖的客户端合并与一致性校验
client.js             自动生成的发布入口，请勿直接编辑
```

边界规划器与 DOM 控制器分离：规划器只处理宿主数据映射出的标量事实，不持有实时宿主对象；运行时只执行规划结果并维护可恢复的页面状态。这让关键边界规则可以在无 DOM 环境下独立测试。

## 🛠️ 开发

环境要求：**Node.js 20 或更高版本**。

```bash
# 生成 client.js
npm run build

# 运行 Node.js 与集成测试
npm test

# 运行真实浏览器回归
npm run test:browser

# 构建可安装的 tgz 包
npm run pack:plugin
```

真实浏览器回归使用独立测试目录，避免影响共享的 `node_modules`：

```bash
npm install --prefix .test-tools --no-save --package-lock=false playwright-core react@18 react-dom@18
npm run test:browser
```

测试默认调用 Windows Microsoft Edge，也可通过 `DSH_TEST_BROWSER` 指定 Chromium 或 Chrome 可执行文件。测试在独立页面挂载真实 React 和模拟宿主数据，不修改当前 DSH 会话或已安装插件。

## 📌 版本与回退

- 当前版本：[`v2.2.0`](https://github.com/new-Beginner/dsh-thought-fold/releases/tag/v2.2.0)
- 历史版本：可在 [Tags](https://github.com/new-Beginner/dsh-thought-fold/tags) 与 [Releases](https://github.com/new-Beginner/dsh-thought-fold/releases) 查看
- 回退方式：在插件管理界面重新安装保留的旧版 `.tgz` 安装包，并重启 DSH

## 📄 License

本项目使用 [MIT License](LICENSE)。
