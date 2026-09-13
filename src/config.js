import z from '@deepseek-ai/schemastery';

/**
 * 插件设置数据模式定义。
 * 保持与 DSH 官方插件相同的静态 Schema 导入方式，避免宿主启动阶段的异步模块求值。
 */
export const SettingsSchema = z.object({
  enabled: z.boolean()
    .default(true)
    .description('是否启用 DSH 原生过程折叠与运行状态样式增强'),

  showLiveHud: z.boolean()
    .default(true)
    .description('增强 DSH 原生运行状态和过程折叠控件的视觉表现'),

  foldStyle: z.union([
    z.const('codex').description('经典样式'),
    z.const('minimal').description('极简样式'),
    z.const('clean').description('清晰样式')
  ]).default('codex').description('DSH 原生过程折叠控件的视觉风格')
});

export const DEFAULT_CONFIG = Object.freeze({
  enabled: true,
  showLiveHud: true,
  foldStyle: 'codex'
});
