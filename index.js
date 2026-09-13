import { SettingsSchema, DEFAULT_CONFIG } from './src/config.js';
import * as webPlugin from './src/web.js';

export { SettingsSchema, DEFAULT_CONFIG } from './src/config.js';

export const name = 'dsh-thought-fold';
export const inject = ['settings'];

export function apply(ctx, config = {}) {
  let settingsScope;
  try {
    settingsScope = ctx.settings.register('dsh-thought-fold', SettingsSchema, {
      base: config
    });
  } catch (err) {
    ctx.logger?.warn?.(`[dsh-thought-fold] 注册设置项失败: ${err.message}`);
  }

  const getConfig = () => (
    settingsScope
      ? { ...DEFAULT_CONFIG, ...settingsScope.get() }
      : { ...DEFAULT_CONFIG, ...config }
  );

  const service = { getConfig, settingsScope };
  ctx.provide('thoughtFoldService', service);
  ctx.plugin(webPlugin);

  ctx.inject(['commands'], (cmdCtx) => {
    cmdCtx.commands.register({
      name: 'fold',
      description: '查看或控制思考与工具过程折叠状态',
      input: { hint: 'status | toggle | help' },
      recordInput: false,
      async handler({ rawInput }) {
        const [subcmd = 'status'] = rawInput.trim().split(/\s+/).filter(Boolean);
        const cfg = getConfig();

        if (subcmd === 'toggle') {
          const next = !cfg.enabled;
          if (settingsScope) {
            await settingsScope.update({ enabled: next });
          }
          return {
            kind: 'success',
            text: `✅ 插件已切换为：**${next ? '开启' : '关闭'}**`
          };
        }

        if (subcmd === 'help') {
          return {
            kind: 'info',
            text: [
              '💡 **思考与工具折叠指令帮助**：',
              '- `/fold status`：查看当前折叠与状态样式',
              '- `/fold toggle`：快速开启或关闭插件',
              '- `/fold help`：显示此帮助'
            ].join('\n')
          };
        }

        return {
          kind: 'info',
          text: [
            '🧠 **思考与工具折叠状态**：',
            `- 插件启用：${cfg.enabled ? '🟢 开启' : '🔴 关闭'}`,
            `- 运行状态样式：${cfg.showLiveHud ? '🟢 开启' : '🔴 关闭'}`,
            `- 折叠按钮样式：\`${cfg.foldStyle}\``
          ].join('\n')
        };
      }
    });
  });
}
