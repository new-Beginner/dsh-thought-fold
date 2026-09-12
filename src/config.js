import z from '@deepseek-ai/schemastery';

/**
 * 插件设置数据模式定义。
 * 保持与 DSH 官方插件相同的静态 Schema 导入方式，避免宿主启动阶段的异步模块求值。
 */
export const SettingsSchema = z.object({
  enabled: z.boolean()
    .default(true)
    .description('是否启用 Codex 风格进度提示与原生折叠增强'),

  autoFold: z.boolean()
    .default(true)
    .description('引导使用 DSH 原生紧凑会话视图，在任务完成后折叠过程节点'),

  showLiveHud: z.boolean()
    .default(true)
    .description('增强 DSH 原生运行中状态和思考过程控件的视觉表现'),

  injectPrompt: z.boolean()
    .default(true)
    .description('注入 Codex 风格进度更新与最终总结规范'),

  promptStyle: z.union([
    z.const('standard').description('标准模式（推荐：阶段进度 + 最终总结）'),
    z.const('concise').description('紧凑模式（更少进度消息）'),
    z.const('deep').description('详细模式（复杂任务提供更多阶段检查点）')
  ]).default('standard').description('进度更新与总结风格'),

  foldStyle: z.union([
    z.const('codex').description('经典 Codex 风格'),
    z.const('minimal').description('极简风格'),
    z.const('clean').description('清晰卡片风格')
  ]).default('codex').description('DSH 原生过程折叠控件的视觉风格'),

  hideRawThinkTag: z.boolean()
    .default(false)
    .description('兼容保留项；安全版本不再直接修改消息 DOM'),

  promptPosition: z.union([
    z.const('after-persona').description('紧跟身份之后 (order: 12，推荐)'),
    z.const('before-tools').description('工具说明之前 (order: 960)'),
    z.const('after-tools').description('工具说明之后 (order: 9960)')
  ]).default('after-persona').description('提示词注入位置')
});

export const DEFAULT_CONFIG = Object.freeze({
  enabled: true,
  autoFold: true,
  showLiveHud: true,
  injectPrompt: true,
  promptStyle: 'standard',
  foldStyle: 'codex',
  hideRawThinkTag: false,
  promptPosition: 'after-persona'
});

export function resolveOrder(position) {
  switch (position) {
    case 'before-tools':
      return 960;
    case 'after-tools':
      return 9960;
    case 'after-persona':
    default:
      return 12;
  }
}
