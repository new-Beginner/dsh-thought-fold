import { SettingsSchema, DEFAULT_CONFIG, resolveOrder } from './src/config.js';
import { getPromptText } from './src/prompt.js';
import * as webPlugin from './src/web.js';

export { SettingsSchema, DEFAULT_CONFIG } from './src/config.js';
export { getPromptText } from './src/prompt.js';

export const name = 'dsh-thought-fold';
export const inject = ['systemPrompt', 'settings'];

export function apply(ctx, config = {}) {
  // 1. 注册设置项
  let settingsScope;
  try {
    settingsScope = ctx.settings.register('dsh-thought-fold', SettingsSchema, {
      base: config
    });
  } catch (err) {
    ctx.logger?.warn?.(`[dsh-thought-fold] 注册设置项失败: ${err.message}`);
  }

  const getConfig = () => (settingsScope ? { ...DEFAULT_CONFIG, ...settingsScope.get() } : { ...DEFAULT_CONFIG, ...config });

  // 2. 注册系统提示词段落 (引导外部模型进行思考和输出最终总结)
  let currentOrder = resolveOrder(getConfig().promptPosition);
  let sectionDisposer = null;

  function mountSection(order) {
    if (typeof sectionDisposer === 'function') {
      sectionDisposer();
      sectionDisposer = null;
    }

    sectionDisposer = ctx.systemPrompt.section({
      name: 'dsh-thought-fold:guidance',
      order,
      text(context) {
        const cfg = getConfig();
        return getPromptText(cfg);
      }
    });
    currentOrder = order;
  }

  mountSection(currentOrder);

  // 3. 监听设置变更
  if (settingsScope?.watch) {
    ctx.effect(() => settingsScope.watch((next, prev) => {
      const nextOrder = resolveOrder(next.promptPosition);
      if (nextOrder !== currentOrder) {
        mountSection(nextOrder);
      }
      ctx.emit('system-prompt/change');
    }), 'dsh-thought-fold:settings-watch');
  }

  // 4. 注册服务
  const service = {
    getConfig,
    settingsScope,
    reload() {
      ctx.emit('system-prompt/change');
    }
  };
  ctx.provide('thoughtFoldService', service);

  // 5. 挂载 Web API 路由插件
  ctx.plugin(webPlugin);

  // 6. 注册斜杠指令 /fold
  ctx.inject(['commands'], (cmdCtx) => {
    cmdCtx.commands.register({
      name: 'fold',
      description: '查看或控制 Codex 思考与工具折叠状态',
      input: { hint: 'status | toggle | reload | help' },
      recordInput: false,
      async handler({ rawInput }) {
        const [subcmd = 'status'] = rawInput.trim().split(/\s+/).filter(Boolean);
        const cfg = getConfig();

        if (subcmd === 'toggle') {
          const next = !cfg.autoFold;
          if (settingsScope) {
            await settingsScope.update({ autoFold: next });
          }
          return {
            kind: 'success',
            text: `✅ 任务完成时自动折叠已切换为: **${next ? '开启' : '关闭'}**`
          };
        }

        if (subcmd === 'reload') {
          service.reload();
          return {
            kind: 'success',
            text: '✅ 思考折叠配置与系统提示词已重载生效。'
          };
        }

        if (subcmd === 'help') {
          return {
            kind: 'info',
            text: [
              '💡 **Codex 思考与工具折叠指令帮助**:',
              '- `/fold status` : 查看当前折叠与 HUD 状态',
              '- `/fold toggle` : 快速开启/关闭任务完成自动折叠',
              '- `/fold reload` : 重载插件提示词与配置',
              '- `/fold help`   : 显示此帮助'
            ].join('\n')
          };
        }

        return {
          kind: 'info',
          text: [
            '🧠 **Codex 思考与工具折叠状态**:',
            `- 插件启用: ${cfg.enabled ? '🟢 开启' : '🔴 关闭'}`,
            `- 任务完成自动折叠: ${cfg.autoFold ? '🟢 开启 (像 Codex 一样收起思考与工具)' : '🔴 关闭'}`,
            `- 实时思考与执行 HUD: ${cfg.showLiveHud ? '🟢 开启 (实时显示模型干到哪了)' : '🔴 关闭'}`,
            `- Codex 规范提示词注入: ${cfg.injectPrompt ? '🟢 开启' : '🔴 关闭'}`,
            `- 提示词风格: \`${cfg.promptStyle}\``,
            `- 折叠外观风格: \`${cfg.foldStyle}\``
          ].join('\n')
        };
      }
    });
  });
}
