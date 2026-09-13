# dsh-thought-fold

DeepSeek Harness 的思考与工具过程折叠增强插件。**2.1.0 基于 2.0.0 增加底部/浮动收起和历史会话兼容折叠**，仍不向模型注入任何指令。

## 交互

- **顶部保持原样**：原生过程组继续使用 DSH 自带的折叠按钮和状态。
- **底部收起**：每个展开的整轮过程都有“收起本段过程”。
- **输入区上方浮动收起**：当前正在阅读的展开组底部不可见或被输入区遮挡时，显示唯一浮动按钮；输入区增高、滚动和窗口尺寸变化时更新位置。
- **多组不冲突**：浮动入口仅对应当前可见且靠近输入区的过程组，点击只收起该组；底部入口可见时不重复显示浮动入口。浮动按钮提示及无障碍标签说明对应轮次。
- **旧会话自动折叠**：进入会话后默认收起已完成过程。原生按钮不可用时，从宿主的轮次结束状态、过程区间和最终回答边界建立兼容折叠；延迟加载历史时同样生效。
- **手动选择不被重置**：同一次会话查看中，重绘、滚动、输入区变化不会重新收起手动展开的内容；原生与兼容模式之间切换时保留选择。重新进入会话或重新启用插件会重新初始化。
- **单独思考块不重复添加按钮**：`data-variant="think"` 继续使用原生顶部控件；仅整段过程组添加底部/浮动入口。

## 稳定性边界

1. 不改写消息文本，不移动或包裹 React 管理的消息行，不修改会话记录。
2. 只在当前会话容器内监听相关 DOM 变化；使用动画帧合并更新，不监听 `document.body`、不定时轮询聊天内容。
3. 原生组以顶部按钮为唯一状态源，兼容组仅隐藏明确属于已完成过程的行；用户消息、最终回答以及宿主独立错误提示保留。
4. 兼容隐藏使用 `hidden="until-found"`，支持浏览器 `beforematch` 揭示，并记录/恢复原始属性。原生紧凑模式接管后，不覆盖其隐藏状态。
5. 会话切换、禁用、卸载时移除自有按钮、观察器和事件监听，恢复兼容隐藏。旧按钮和过期设置请求不得影响新实例。
6. **不猜测边界**：缺少宿主轮次/回答元数据、尚未结束的任务、未知旧版渲染结构保持可见；不按“最后一段文字看起来像回答”推断。
7. 关闭“增强运行状态样式”只关闭外观增强，不关闭底部/浮动和兼容折叠；关闭“启用插件”才移除这些增强。

本版兼容路径要求宿主提供 `conversation.composer.dock`、`useChat` 节点/时间线数据，以及 `data-chat-flow`、`data-chat-turn`、`data-composer-seat` 等聊天标记。代码按当前 Desktop 打包宿主核对。缺少所需 Hook 或无法识别的结构安全退回原始显示，不尝试重写整页。

## 安装与更新

可通过 DSH 的插件管理界面安装本地打包文件 `dsh-thought-fold-2.1.0.tgz`。保留 `dsh-thought-fold-2.0.0.tgz` 可回退。

安装新版本后重启 DSH；本项目的构建不会自动替换已安装插件，也不会自动更新当前打开的页面。

GitHub 安装（仓库发布更新后）：

```bash
# Desktop Profile
dsh plugin --profile desktop add github:new-Beginner/dsh-thought-fold

# Web Profile
dsh plugin --profile web add github:new-Beginner/dsh-thought-fold
```

建议继续使用 DSH 的“紧凑会话视图”。标准模式及历史未完整加载导致原生按钮不可用时，本版会启用符合边界要求的兼容折叠，不会擅自修改宿主的通用设置。

## 配置与指令

```yaml
dsh-thought-fold:
  enabled: true
  showLiveHud: true
  foldStyle: codex # codex | minimal | clean
```

配置键保持与 2.0.0 一致，旧提示注入字段会被忽略。设置中心的“思考折叠”修改即时生效。

- `/fold status`：查看插件与外观状态。
- `/fold toggle`：切换持久化启用状态；在外部更改配置后重新打开设置页或刷新页面同步客户端。
- `/fold help`：显示帮助。

## 开发与验证

`client.js` 是生成文件，请修改：

- `src/client-entry.js`：模块入口、设置页、样式与实例生命周期。
- `src/fold-runtime.js`：会话作用域控制器、原生/兼容组、浮动定位。
- `scripts/build-client.js`：零构建依赖的源文件合并与一致性检查。

```bash
npm run build
npm test
npm run pack:plugin
```

`npm test` 包含 Host 回归、设置生命周期用例、客户端 VM 检查以及生成产物一致性检查。`npm pack` 前会自动构建。

真实浏览器回归使用独立测试目录，避免影响可能共享的 `node_modules`：

```bash
npm install --prefix .test-tools --no-save --package-lock=false playwright-core react@18 react-dom@18
npm run test:browser
```

测试默认使用 Windows 的 Microsoft Edge，可通过 `DSH_TEST_BROWSER` 指定 Chromium/Chrome 可执行文件。测试在独立浏览器页面挂载真实 React 与模拟宿主数据，不修改当前 DSH 会话或已安装插件。实际安装后的目标旧会话仍需验收。

## License

MIT
