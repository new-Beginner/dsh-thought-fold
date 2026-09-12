window.__ModuleLoader__.load({
  id: 'dsh-thought-fold',
  factory: (require) => {
    const React = require('react');
    const { useCallback, useEffect, useState } = React;
    const h = React.createElement;

    const DEFAULT_CONFIG = Object.freeze({
      enabled: true,
      autoFold: true,
      showLiveHud: true,
      injectPrompt: true,
      promptStyle: 'standard',
      foldStyle: 'codex',
      hideRawThinkTag: false,
      promptPosition: 'after-persona'
    });

    const ICONS = {
      brain: 'M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24A2.5 2.5 0 0 1 9.5 2zm5 0A2.5 2.5 0 0 1 17 4.5a2.5 2.5 0 0 1 1.32 4.24 3 3 0 0 1-.34 5.58 2.5 2.5 0 0 1-2.96 3.08A2.5 2.5 0 0 1 12 19.5v-15A2.5 2.5 0 0 1 14.5 2z',
      check: 'M20 6 9 17l-5-5',
      info: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-6h2zm0-8h-2V7h2z',
      sliders: 'M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M1 14h6m2-6h6m2 8h6'
    };

    function Icon({ name, size = 16 }) {
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true
      }, h('path', { d: ICONS[name] || ICONS.brain }));
    }

    const STYLE_ID = 'dsh-thought-fold-safe-styles';
    const CSS = `
      /* Codex-style Turn Process Pill: compact, theme-adaptive, non-intrusive. */
      [data-chat-flow-kind="turn-process"] {
        display: flex !important;
        justify-content: flex-start !important;
        align-items: center !important;
        margin-block: 4px 10px !important;
        width: 100% !important;
      }
      [data-chat-flow-kind="turn-process"] > button,
      button[data-turn-process] {
        box-sizing: border-box !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: flex-start !important;
        width: auto !important;
        width: fit-content !important;
        max-width: 100% !important;
        height: 28px !important;
        min-height: 28px !important;
        padding: 0 12px 0 10px !important;
        border-radius: 9999px !important;
        border: 1px solid color-mix(in srgb, var(--dsw-alias-border-l2, #cbd5e1) 50%, transparent) !important;
        background: color-mix(in srgb, var(--dsw-alias-label-primary, #0f172a) 4.5%, transparent) !important;
        color: var(--dsw-alias-label-secondary, #64748b) !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        line-height: 26px !important;
        letter-spacing: -0.01em !important;
        cursor: pointer !important;
        user-select: none !important;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02) !important;
        transition: background-color .15s ease, border-color .15s ease, color .15s ease, box-shadow .15s ease, transform .1s ease !important;
      }
      [data-chat-flow-kind="turn-process"] > button::before,
      button[data-turn-process]::before {
        content: "";
        display: inline-block;
        width: 12px;
        height: 12px;
        margin-right: 6px;
        flex: none;
        background-color: currentColor;
        opacity: 0.72;
        -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 5l3.5 3L3 11M8 11h5'/%3E%3C/svg%3E") no-repeat center / contain;
        mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 5l3.5 3L3 11M8 11h5'/%3E%3C/svg%3E") no-repeat center / contain;
        transition: opacity .15s ease;
      }
      [data-chat-flow-kind="turn-process"] > button:hover,
      button[data-turn-process]:hover {
        border-color: color-mix(in srgb, var(--dsw-alias-interactive-accent, #3b82f6) 45%, transparent) !important;
        background: color-mix(in srgb, var(--dsw-alias-label-primary, #0f172a) 8%, transparent) !important;
        color: var(--dsw-alias-label-primary, #0f172a) !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
      }
      [data-chat-flow-kind="turn-process"] > button:hover::before,
      button[data-turn-process]:hover::before {
        opacity: 1;
      }
      [data-chat-flow-kind="turn-process"] > button[data-open],
      button[data-turn-process][data-open] {
        background: color-mix(in srgb, var(--dsw-alias-interactive-accent, #3b82f6) 9%, transparent) !important;
        border-color: color-mix(in srgb, var(--dsw-alias-interactive-accent, #3b82f6) 35%, transparent) !important;
        color: var(--dsw-alias-interactive-accent, #2563eb) !important;
      }
      [data-chat-flow-kind="turn-process"] > button:active,
      button[data-turn-process]:active {
        transform: scale(0.985) !important;
      }
      [data-chat-flow-kind="turn-process"] svg,
      button[data-turn-process] svg {
        width: 13px !important;
        height: 13px !important;
        margin-left: 5px !important;
        color: inherit !important;
        opacity: 0.65 !important;
        flex: none !important;
        transition: transform .18s cubic-bezier(0.16, 1, 0.3, 1), opacity .15s ease !important;
      }
      [data-chat-flow-kind="turn-process"] > button:hover svg,
      button[data-turn-process]:hover svg {
        opacity: 1 !important;
      }
      [data-chat-flow-kind="turn-process"] [data-turn-process-tool-calls],
      [data-chat-flow-kind="turn-process"] [data-turn-process-messages],
      [data-chat-flow-kind="turn-process"] [data-turn-process-subagents] { font-variant-numeric: tabular-nums; }
      .dsh-tf-settings { max-width: 860px; margin: 0 auto; padding: 20px; color: var(--dsw-alias-label-primary, #e5e7eb); }
      .dsh-tf-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-bottom: 16px; margin-bottom: 18px; border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.1)); }
      .dsh-tf-title { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 650; }
      .dsh-tf-title svg { color: var(--dsw-alias-interactive-accent, #3b82f6); }
      .dsh-tf-status { padding: 3px 9px; border-radius: 999px; font-size: 11px; border: 1px solid rgba(34,197,94,.28); color: #4ade80; background: rgba(34,197,94,.1); }
      .dsh-tf-status[data-enabled="false"] { border-color: rgba(148,163,184,.25); color: #94a3b8; background: rgba(148,163,184,.08); }
      .dsh-tf-card { margin-bottom: 16px; padding: 16px 18px; border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.09)); border-radius: 9px; background: var(--dsw-alias-surface-l1, rgba(255,255,255,.025)); }
      .dsh-tf-card-title { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 14px; font-weight: 650; }
      .dsh-tf-row { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 11px 0; border-bottom: 1px solid rgba(148,163,184,.09); }
      .dsh-tf-row:last-child { border-bottom: 0; }
      .dsh-tf-row-copy { min-width: 0; flex: 1; }
      .dsh-tf-label { font-size: 13px; font-weight: 560; }
      .dsh-tf-desc { margin-top: 3px; color: var(--dsw-alias-label-secondary, #94a3b8); font-size: 12px; line-height: 1.45; }
      .dsh-tf-select { max-width: 320px; padding: 6px 9px; border: 1px solid var(--dsw-alias-border-l3, rgba(255,255,255,.12)); border-radius: 6px; color: inherit; background: var(--dsw-alias-surface-l2, #172033); }
      .dsh-tf-toggle { position: relative; width: 42px; height: 23px; flex: 0 0 auto; }
      .dsh-tf-toggle input { width: 1px; height: 1px; opacity: 0; }
      .dsh-tf-toggle span { position: absolute; inset: 0; cursor: pointer; border-radius: 999px; background: rgba(148,163,184,.28); transition: .18s ease; }
      .dsh-tf-toggle span::before { content: ''; position: absolute; left: 3px; top: 3px; width: 17px; height: 17px; border-radius: 50%; background: white; transition: .18s ease; }
      .dsh-tf-toggle input:checked + span { background: var(--dsw-alias-interactive-accent, #3b82f6); }
      .dsh-tf-toggle input:checked + span::before { transform: translateX(19px); }
      .dsh-tf-notice { display: flex; align-items: flex-start; gap: 9px; padding: 11px 12px; border: 1px solid rgba(59,130,246,.24); border-radius: 7px; color: var(--dsw-alias-label-secondary, #cbd5e1); background: rgba(59,130,246,.07); font-size: 12px; line-height: 1.5; }
      .dsh-tf-notice svg { flex: 0 0 auto; margin-top: 1px; color: #60a5fa; }
      .dsh-tf-preview { margin: 10px 0 0; max-height: 260px; overflow: auto; padding: 12px; border-radius: 7px; background: rgba(0,0,0,.22); color: var(--dsw-alias-label-secondary, #cbd5e1); white-space: pre-wrap; font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
      .dsh-tf-toast { margin-bottom: 14px; color: #4ade80; font-size: 12px; }
    `;

    function mountStyles() {
      if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = CSS;
      document.head.appendChild(style);
    }

    async function requestSettings(method = 'GET', body) {
      const response = await fetch('/api/dsh-thought-fold', {
        method,
        credentials: 'same-origin',
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined
      });
      const payload = await response.json();
      if (!response.ok || payload.error) throw new Error(payload.error || `HTTP ${response.status}`);
      return payload;
    }

    function Toggle({ checked, onChange, disabled }) {
      return h('label', { className: 'dsh-tf-toggle' },
        h('input', { type: 'checkbox', checked, disabled, onChange: (event) => onChange(event.target.checked) }),
        h('span')
      );
    }

    function SettingRow({ label, description, children }) {
      return h('div', { className: 'dsh-tf-row' },
        h('div', { className: 'dsh-tf-row-copy' },
          h('div', { className: 'dsh-tf-label' }, label),
          h('div', { className: 'dsh-tf-desc' }, description)
        ),
        children
      );
    }

    function ThoughtFoldSettingsView() {
      const [config, setConfig] = useState(DEFAULT_CONFIG);
      const [preview, setPreview] = useState('');
      const [busy, setBusy] = useState(true);
      const [toast, setToast] = useState('');
      const [error, setError] = useState('');

      const refresh = useCallback(async () => {
        try {
          const payload = await requestSettings();
          setConfig({ ...DEFAULT_CONFIG, ...(payload.config || {}) });
          setPreview(payload.promptPreview || '');
          setError('');
        } catch (err) {
          setError(`读取设置失败：${err.message}`);
        } finally {
          setBusy(false);
        }
      }, []);

      useEffect(() => { refresh(); }, [refresh]);

      const update = useCallback(async (patch) => {
        setBusy(true);
        setConfig((current) => ({ ...current, ...patch }));
        try {
          const payload = await requestSettings('POST', { action: 'saveSettings', patch });
          setConfig({ ...DEFAULT_CONFIG, ...(payload.config || {}) });
          setPreview(payload.promptPreview || '');
          setToast('设置已保存，新一轮对话开始生效。');
          setError('');
          window.setTimeout(() => setToast(''), 2600);
        } catch (err) {
          setError(`保存失败：${err.message}`);
          await refresh();
        } finally {
          setBusy(false);
        }
      }, [refresh]);

      return h('div', { className: 'dsh-tf-settings' },
        h('div', { className: 'dsh-tf-header' },
          h('div', { className: 'dsh-tf-title' }, h(Icon, { name: 'brain', size: 21 }), 'Codex 思考与折叠（安全版）'),
          h('span', { className: 'dsh-tf-status', 'data-enabled': String(Boolean(config.enabled)) }, config.enabled ? '已启用' : '已停用')
        ),
        toast && h('div', { className: 'dsh-tf-toast' }, h(Icon, { name: 'check', size: 13 }), ' ', toast),
        error && h('div', { className: 'dsh-tf-notice', style: { borderColor: 'rgba(239,68,68,.3)' } }, h(Icon, { name: 'info' }), error),
        h('div', { className: 'dsh-tf-card' },
          h('div', { className: 'dsh-tf-card-title' }, h(Icon, { name: 'sliders' }), '运行设置'),
          h(SettingRow, { label: '启用插件', description: '启用进度提示词和 DSH 原生过程控件的 Codex 风格增强。' },
            h(Toggle, { checked: Boolean(config.enabled), disabled: busy, onChange: (value) => update({ enabled: value }) })
          ),
          h(SettingRow, { label: '任务完成后折叠过程', description: '使用 DSH 原生 Compact Transcript 折叠，不再扫描或重写聊天 DOM。请同时在 DSH 通用设置中将“会话记录视图”设为“紧凑”。' },
            h(Toggle, { checked: Boolean(config.autoFold), disabled: busy, onChange: (value) => update({ autoFold: value }) })
          ),
          h(SettingRow, { label: '增强运行状态样式', description: '仅通过静态 CSS 增强原生 turn-process 与 streaming 状态；不会创建 MutationObserver。' },
            h(Toggle, { checked: Boolean(config.showLiveHud), disabled: busy, onChange: (value) => update({ showLiveHud: value }) })
          ),
          h(SettingRow, { label: '注入 Codex 进度与总结规范', description: '让外部模型在关键阶段输出简短进度更新，并在所有工具完成后输出最终总结。' },
            h(Toggle, { checked: Boolean(config.injectPrompt), disabled: busy, onChange: (value) => update({ injectPrompt: value }) })
          ),
          h(SettingRow, { label: '进度详细程度', description: '控制外部模型发送阶段进度更新的频率。' },
            h('select', { className: 'dsh-tf-select', value: config.promptStyle, disabled: busy, onChange: (event) => update({ promptStyle: event.target.value }) },
              h('option', { value: 'standard' }, '标准（推荐）'),
              h('option', { value: 'concise' }, '紧凑'),
              h('option', { value: 'deep' }, '详细')
            )
          )
        ),
        h('div', { className: 'dsh-tf-card' },
          h('div', { className: 'dsh-tf-card-title' }, h(Icon, { name: 'info' }), '安全机制'),
          h('div', { className: 'dsh-tf-notice' },
            h(Icon, { name: 'info' }),
            h('span', null, 'v1.0.1 已移除上一版导致白屏的全局 MutationObserver、聊天 DOM 轮询、innerHTML 重写和 <think> 标签原地清洗。折叠完全交给 DSH 内置 turn-process 机制，插件只负责提示词和非侵入式样式。')
          ),
          h('pre', { className: 'dsh-tf-preview' }, preview || '当前未注入提示词。')
        )
      );
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        mountStyles();
        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'thought-fold',
          order: 15,
          label: () => 'Codex 思考与折叠'
        }, ThoughtFoldSettingsView));
      }
    };
  }
});
