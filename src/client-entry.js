window.__ModuleLoader__.load({
  id: 'dsh-thought-fold',
  factory: (require) => {
    const React = require('react');
    const { useCallback, useEffect, useState } = React;
    const h = React.createElement;

    const DEFAULT_CONFIG = Object.freeze({
      enabled: true,
      showLiveHud: true,
      foldStyle: 'codex'
    });

    const ICONS = {
      brain: 'M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24A2.5 2.5 0 0 1 9.5 2zm5 0A2.5 2.5 0 0 1 17 4.5a2.5 2.5 0 0 1 1.32 4.24 3 3 0 0 1-.34 5.58 2.5 2.5 0 0 1-2.96 3.08A2.5 2.5 0 0 1 12 19.5v-15A2.5 2.5 0 0 1 14.5 2z',
      check: 'M20 6 9 17l-5-5',
      info: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-6h2zm0-8h-2V7h2z',
      sliders: 'M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M1 14h6m2-6h6m2 8h6',
      palette: 'M12 2a10 10 0 0 0 0 20h1.2a2.3 2.3 0 0 0 0-4.6h-1.4a1.8 1.8 0 0 1 0-3.6H14a8 8 0 0 0 0-16h-2zM7.5 9.5h.01M9.5 6.5h.01M14 6h.01M17 9h.01',
      shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zm-3-10 2 2 4-4'
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
    const ROOT_ATTRIBUTE = 'data-dsh-thought-fold';
    const CSS = `
      :root[data-dsh-thought-fold] [data-chat-flow-kind="turn-process"] {
        display: flex !important;
        justify-content: flex-start !important;
        align-items: center !important;
        width: 100% !important;
        margin-block: 4px 10px !important;
      }
      :root[data-dsh-thought-fold] [data-chat-flow-kind="turn-process"] > button,
      :root[data-dsh-thought-fold] button[data-turn-process] {
        box-sizing: border-box !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: flex-start !important;
        width: fit-content !important;
        max-width: 100% !important;
        min-height: 28px !important;
        padding: 0 12px 0 10px !important;
        border: 1px solid color-mix(in srgb, var(--dsw-alias-border-l2, #d9dde3) 72%, transparent) !important;
        border-radius: 999px !important;
        background: color-mix(in srgb, var(--dsw-alias-label-primary, #1f2328) 4.5%, transparent) !important;
        color: var(--dsw-alias-label-secondary, #68707d) !important;
        box-shadow: 0 1px 2px rgba(15, 23, 42, .03) !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        line-height: 26px !important;
        letter-spacing: -.01em !important;
        cursor: pointer !important;
        user-select: none !important;
        transition: background-color .16s ease, border-color .16s ease, color .16s ease, box-shadow .16s ease, transform .1s ease !important;
      }
      :root[data-dsh-thought-fold] [data-chat-flow-kind="turn-process"] > button::before,
      :root[data-dsh-thought-fold] button[data-turn-process]::before {
        content: "";
        display: inline-block;
        width: 12px;
        height: 12px;
        margin-right: 6px;
        flex: none;
        background-color: currentColor;
        opacity: .72;
        -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 5l3.5 3L3 11M8 11h5'/%3E%3C/svg%3E") no-repeat center / contain;
        mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 5l3.5 3L3 11M8 11h5'/%3E%3C/svg%3E") no-repeat center / contain;
      }
      :root[data-dsh-thought-fold] [data-chat-flow-kind="turn-process"] > button:hover,
      :root[data-dsh-thought-fold] button[data-turn-process]:hover {
        border-color: color-mix(in srgb, var(--dsw-alias-brand-primary, #4f6ef7) 45%, transparent) !important;
        background: var(--dsw-alias-interactive-bg-hover, rgba(15, 23, 42, .06)) !important;
        color: var(--dsw-alias-label-primary, #1f2328) !important;
        box-shadow: 0 2px 5px rgba(15, 23, 42, .06) !important;
      }
      :root[data-dsh-thought-fold] [data-chat-flow-kind="turn-process"] > button[data-open],
      :root[data-dsh-thought-fold] button[data-turn-process][data-open] {
        border-color: color-mix(in srgb, var(--dsw-alias-brand-primary, #4f6ef7) 38%, transparent) !important;
        background: color-mix(in srgb, var(--dsw-alias-brand-primary, #4f6ef7) 9%, transparent) !important;
        color: var(--dsw-alias-brand-primary, #4f6ef7) !important;
      }
      :root[data-dsh-thought-fold] [data-chat-flow-kind="turn-process"] > button:focus-visible,
      :root[data-dsh-thought-fold] button[data-turn-process]:focus-visible {
        outline: 2px solid var(--dsw-alias-brand-primary, #4f6ef7) !important;
        outline-offset: 2px !important;
      }
      :root[data-dsh-thought-fold] [data-chat-flow-kind="turn-process"] > button:active,
      :root[data-dsh-thought-fold] button[data-turn-process]:active { transform: scale(.985) !important; }
      :root[data-dsh-thought-fold] [data-chat-flow-kind="turn-process"] svg,
      :root[data-dsh-thought-fold] button[data-turn-process] svg {
        width: 13px !important;
        height: 13px !important;
        margin-left: 5px !important;
        flex: none !important;
        color: inherit !important;
        opacity: .68 !important;
      }
      :root[data-dsh-thought-fold] [data-chat-flow-kind="turn-process"] [data-turn-process-tool-calls],
      :root[data-dsh-thought-fold] [data-chat-flow-kind="turn-process"] [data-turn-process-messages],
      :root[data-dsh-thought-fold] [data-chat-flow-kind="turn-process"] [data-turn-process-subagents] { font-variant-numeric: tabular-nums; }
      :root[data-dsh-thought-fold="minimal"] [data-chat-flow-kind="turn-process"] > button,
      :root[data-dsh-thought-fold="minimal"] button[data-turn-process] {
        padding-inline: 4px 7px !important;
        border-color: transparent !important;
        background: transparent !important;
        box-shadow: none !important;
      }
      :root[data-dsh-thought-fold="clean"] [data-chat-flow-kind="turn-process"] > button,
      :root[data-dsh-thought-fold="clean"] button[data-turn-process] {
        min-height: 32px !important;
        border-radius: 8px !important;
        background: var(--dsw-alias-bg-layer-2, #f7f8fa) !important;
      }

      [data-dsh-tf-native-suspended] { display: none !important; }
      [data-dsh-tf-native-reveal]:not([data-dsh-tf-hidden]) { display: block !important; content-visibility: visible !important; }
      [data-turn-process-inline][data-dsh-tf-native-reveal]:not([data-dsh-tf-hidden]) { margin-bottom: 0 !important; }
      [data-dsh-tf-hidden][hidden="until-found"] { content-visibility: hidden; height: 0 !important; min-height: 0 !important; margin-block: 0 !important; padding-block: 0 !important; border-block-width: 0 !important; overflow: clip; }
      .dsh-tf-fold-button {
        box-sizing: border-box;
        display: inline-flex;
        align-items: center;
        justify-content: flex-start;
        align-self: flex-start;
        width: fit-content;
        max-width: 100%;
        min-height: 32px;
        padding: 4px 12px;
        border: 1px solid var(--dsw-alias-border-l2, #d9dde3);
        border-radius: 999px;
        background: var(--dsw-alias-bg-layer-1, #fff);
        color: var(--dsw-alias-label-secondary, #68707d);
        font: inherit;
        font-size: 12px;
        line-height: 22px;
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .dsh-tf-fold-button::before { content: ''; width: 7px; height: 7px; margin: 4px 8px 0 0; border: solid currentColor; border-width: 1.5px 0 0 1.5px; transform: rotate(45deg); flex: none; }
      .dsh-tf-fold-button[aria-expanded="false"]::before { transform: rotate(225deg); margin-top: -3px; }
      .dsh-tf-fold-button[hidden] { display: none !important; }
      .dsh-tf-fold-button:hover { color: var(--dsw-alias-brand-primary, #4f6ef7); border-color: currentColor; }
      .dsh-tf-fold-button:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #4f6ef7); outline-offset: 2px; }
      [data-dsh-tf-bottom] { margin-block: 8px 4px !important; }
      [data-dsh-tf-floating] { position: fixed; z-index: 8; height: 36px; box-shadow: 0 3px 14px rgba(15, 23, 42, .12); pointer-events: auto; }
      :root[data-dsh-thought-fold="minimal"] .dsh-tf-fold-button:not([data-dsh-tf-floating]) { border-color: transparent; background: transparent; }
      :root[data-dsh-thought-fold="clean"] .dsh-tf-fold-button { border-radius: 8px; background: var(--dsw-alias-bg-layer-2, #f7f8fa); }

      .dsh-tf-settings {
        --tf-bg: var(--dsw-alias-bg-layer-1, #fff);
        --tf-bg-soft: var(--dsw-alias-bg-layer-2, #f7f8fa);
        --tf-text: var(--dsw-alias-label-primary, #1f2328);
        --tf-muted: var(--dsw-alias-label-secondary, #68707d);
        --tf-subtle: var(--dsw-alias-label-tertiary, #8b93a1);
        --tf-border: var(--dsw-alias-border-l2, #e5e7eb);
        --tf-accent: var(--dsw-alias-brand-primary, #4f6ef7);
        --tf-success: var(--dsw-alias-state-success-primary, #16803d);
        --tf-success-bg: var(--dsw-alias-state-success-tertiary, rgba(22, 163, 74, .09));
        box-sizing: border-box;
        width: 100%;
        max-width: 720px;
        min-width: 0;
        margin: 0 auto;
        padding: 8px 4px 28px;
        color: var(--tf-text);
        font-family: Inter, "SF Pro Text", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
      }
      .dsh-tf-settings *, .dsh-tf-settings *::before, .dsh-tf-settings *::after { box-sizing: border-box; }
      .dsh-tf-header {
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 0;
        margin-bottom: 24px;
        padding: 4px 2px 20px;
        border-bottom: 1px solid var(--tf-border);
      }
      .dsh-tf-title-row { display: flex; align-items: center; gap: 10px; min-width: 0; }
      .dsh-tf-title-icon { display: inline-flex; flex: none; color: var(--tf-accent); }
      .dsh-tf-title {
        min-width: 0;
        margin: 0;
        overflow: hidden;
        color: var(--tf-text);
        font-size: 18px;
        font-weight: 650;
        line-height: 1.35;
        letter-spacing: -.012em;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .dsh-tf-status {
        flex: none;
        margin-left: auto;
        padding: 3px 9px;
        border: 1px solid color-mix(in srgb, var(--tf-success) 34%, transparent);
        border-radius: 999px;
        background: var(--tf-success-bg);
        color: var(--tf-success);
        font-size: 11px;
        font-weight: 600;
        line-height: 1.45;
        white-space: nowrap;
      }
      .dsh-tf-status[data-enabled="false"] {
        border-color: color-mix(in srgb, var(--tf-subtle) 28%, transparent);
        background: color-mix(in srgb, var(--tf-subtle) 8%, transparent);
        color: var(--tf-subtle);
      }
      .dsh-tf-subtitle { max-width: 620px; margin: 0; color: var(--tf-muted); font-size: 13px; line-height: 1.55; }
      .dsh-tf-feedback { display: flex; align-items: flex-start; gap: 7px; margin: -8px 2px 16px; font-size: 12px; line-height: 1.5; }
      .dsh-tf-feedback svg { flex: none; margin-top: 1px; }
      .dsh-tf-toast { color: var(--tf-success); }
      .dsh-tf-error { color: var(--dsw-alias-state-error-primary, #d54941); }
      .dsh-tf-card {
        margin: 0 0 16px;
        padding: 20px 22px;
        border: 1px solid var(--tf-border);
        border-radius: 12px;
        background: var(--tf-bg);
      }
      .dsh-tf-card-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 4px;
        color: var(--tf-text);
        font-size: 14px;
        font-weight: 650;
        line-height: 1.4;
      }
      .dsh-tf-card-title svg { color: var(--tf-muted); }
      .dsh-tf-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        min-width: 0;
        padding: 16px 0;
        border-bottom: 1px solid color-mix(in srgb, var(--tf-border) 76%, transparent);
      }
      .dsh-tf-row:last-child { padding-bottom: 0; border-bottom: 0; }
      .dsh-tf-row-copy { min-width: 0; flex: 1; }
      .dsh-tf-label { color: var(--tf-text); font-size: 14px; font-weight: 600; line-height: 1.45; }
      .dsh-tf-desc { max-width: 500px; margin-top: 4px; color: var(--tf-muted); font-size: 13px; line-height: 1.55; overflow-wrap: anywhere; }
      .dsh-tf-control { display: flex; width: 160px; flex: 0 0 160px; justify-content: flex-end; }
      .dsh-tf-select {
        width: 160px;
        height: 36px;
        padding: 0 34px 0 12px;
        border: 1px solid var(--tf-border);
        border-radius: 8px;
        outline: none;
        background-color: var(--tf-bg);
        color: var(--tf-text);
        font: inherit;
        font-size: 13px;
        line-height: 34px;
        cursor: pointer;
      }
      .dsh-tf-select option { background-color: var(--tf-bg); color: var(--tf-text); }
      .dsh-tf-select:hover:not(:disabled) { border-color: color-mix(in srgb, var(--tf-accent) 44%, var(--tf-border)); }
      .dsh-tf-select:focus-visible { border-color: var(--tf-accent); outline: 2px solid color-mix(in srgb, var(--tf-accent) 26%, transparent); outline-offset: 2px; }
      .dsh-tf-select:disabled { cursor: not-allowed; opacity: .52; }
      .dsh-tf-toggle { position: relative; display: inline-flex; width: 44px; height: 24px; flex: 0 0 auto; }
      .dsh-tf-toggle input { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; border: 0; clip: rect(0 0 0 0); overflow: hidden; }
      .dsh-tf-toggle span { position: absolute; inset: 0; border-radius: 999px; background: color-mix(in srgb, var(--tf-muted) 30%, transparent); cursor: pointer; transition: background-color .18s ease; }
      .dsh-tf-toggle span::before { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(15, 23, 42, .16); transition: transform .18s cubic-bezier(.2,.8,.2,1); }
      .dsh-tf-toggle input:checked + span { background: var(--tf-accent); }
      .dsh-tf-toggle input:checked + span::before { transform: translateX(20px); }
      .dsh-tf-toggle input:focus-visible + span { outline: 2px solid var(--tf-accent); outline-offset: 2px; }
      .dsh-tf-toggle input:disabled + span { cursor: not-allowed; opacity: .48; }
      .dsh-tf-assurance {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin: 4px 2px 0;
        color: var(--tf-subtle);
        font-size: 12px;
        line-height: 1.55;
      }
      .dsh-tf-assurance svg { flex: none; margin-top: 1px; color: var(--tf-muted); }
      @media (max-width: 640px) {
        .dsh-tf-settings { padding-inline: 0; }
        .dsh-tf-card { padding: 18px; }
        .dsh-tf-row { align-items: flex-start; gap: 14px; }
        .dsh-tf-control { width: auto; flex-basis: auto; }
      }
      @media (max-width: 480px) {
        .dsh-tf-header { margin-bottom: 18px; }
        .dsh-tf-row { flex-direction: column; }
        .dsh-tf-control { width: 100%; justify-content: flex-start; }
        .dsh-tf-select { width: 100%; }
      }
      @media (prefers-reduced-motion: reduce) {
        :root[data-dsh-thought-fold] [data-chat-flow-kind="turn-process"] > button,
        :root[data-dsh-thought-fold] button[data-turn-process],
        .dsh-tf-toggle span,
        .dsh-tf-toggle span::before { transition: none !important; }
      }
    `;

    // @fold-runtime

    function mountStyles() {
      if (typeof document === 'undefined') return null;
      let style = document.getElementById(STYLE_ID);
      if (!style) {
        style = document.createElement('style');
        style.id = STYLE_ID;
        document.head.appendChild(style);
      }
      style.textContent = CSS;
      return style;
    }

    let runtimeOwner = null;
    let disposeRuntimeOwner = null;

    function clearRuntime() {
      runtimeConfig = null;
      // Let mounted docks release their local controller references as well.
      for (const listener of runtimeListeners) listener();
      for (const controller of runtimeControllers) controller.dispose();
      if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.removeAttribute(ROOT_ATTRIBUTE);
      }
    }

    function syncRuntimeAppearance(config, owner) {
      if (!owner || runtimeOwner !== owner) return;
      runtimeConfig = config;
      for (const listener of runtimeListeners) listener();
      if (typeof document === 'undefined' || !document.documentElement) return;
      if (config.enabled && config.showLiveHud) {
        const style = ['codex', 'minimal', 'clean'].includes(config.foldStyle) ? config.foldStyle : 'codex';
        document.documentElement.setAttribute(ROOT_ATTRIBUTE, style);
      } else {
        document.documentElement.removeAttribute(ROOT_ATTRIBUTE);
      }
    }

    async function requestSettings(method = 'GET', body, signal) {
      const response = await fetch('/api/dsh-thought-fold', {
        signal,
        method,
        credentials: 'same-origin',
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined
      });
      const payload = await response.json();
      if (!response.ok || payload.error) throw new Error(payload.error || `HTTP ${response.status}`);
      return payload;
    }

    function Toggle({ checked, onChange, disabled, label }) {
      return h('label', { className: 'dsh-tf-toggle' },
        h('input', {
          type: 'checkbox',
          checked,
          disabled,
          'aria-label': label,
          onChange: (event) => onChange(event.target.checked)
        }),
        h('span', { 'aria-hidden': true })
      );
    }

    function SettingRow({ label, description, children }) {
      return h('div', { className: 'dsh-tf-row' },
        h('div', { className: 'dsh-tf-row-copy' },
          h('div', { className: 'dsh-tf-label' }, label),
          h('div', { className: 'dsh-tf-desc' }, description)
        ),
        h('div', { className: 'dsh-tf-control' }, children)
      );
    }

    function ThoughtFoldSettingsView({ owner }) {
      const [config, setConfig] = useState(DEFAULT_CONFIG);
      const [busy, setBusy] = useState(true);
      const [writable, setWritable] = useState(true);
      const [toast, setToast] = useState('');
      const [error, setError] = useState('');
      const lifecycle = React.useRef(null);

      const refresh = useCallback(async (saveError = '') => {
        const life = lifecycle.current;
        if (!life || runtimeOwner !== owner) return;
        const version = ++owner.settingsVersion;
        const current = () => lifecycle.current === life && runtimeOwner === owner && owner.settingsVersion === version;
        setBusy(true);
        try {
          const payload = await requestSettings('GET', undefined, life.abort.signal);
          if (!current()) return;
          const nextConfig = { ...DEFAULT_CONFIG, ...(payload.config || {}) };
          setConfig(nextConfig);
          setWritable(payload.writable !== false);
          syncRuntimeAppearance(nextConfig, owner);
          setError(saveError || (payload.writable === false ? '设置服务不可用，当前配置为只读状态。' : ''));
        } catch (err) {
          if (!current()) return;
          clearRuntime();
          setWritable(false);
          setError(`${saveError ? saveError + '；' : ''}读取设置失败：${err.message}`);
        } finally {
          if (current()) setBusy(false);
        }
      }, [owner]);

      useEffect(() => {
        if (runtimeOwner !== owner) return;
        const life = { abort: new AbortController(), toastTimer: null };
        lifecycle.current = life;
        const cleanup = () => {
          life.abort.abort();
          if (life.toastTimer !== null) window.clearTimeout(life.toastTimer);
          if (lifecycle.current === life) lifecycle.current = null;
          owner.cleanups.delete(cleanup);
        };
        owner.cleanups.add(cleanup);
        refresh();
        return cleanup;
      }, [owner, refresh]);

      const update = useCallback(async (patch) => {
        const life = lifecycle.current;
        if (!life || runtimeOwner !== owner) return;
        const version = ++owner.settingsVersion;
        const current = () => lifecycle.current === life && runtimeOwner === owner && owner.settingsVersion === version;
        if (life.toastTimer !== null) window.clearTimeout(life.toastTimer);
        life.toastTimer = null;
        setToast('');
        setBusy(true);
        setConfig((currentConfig) => ({ ...currentConfig, ...patch }));
        try {
          const payload = await requestSettings('POST', { action: 'saveSettings', patch }, life.abort.signal);
          if (!current()) return;
          const nextConfig = { ...DEFAULT_CONFIG, ...(payload.config || {}) };
          setConfig(nextConfig);
          setWritable(payload.writable !== false);
          syncRuntimeAppearance(nextConfig, owner);
          setToast('设置已保存并立即生效。');
          setError('');
          life.toastTimer = window.setTimeout(() => {
            life.toastTimer = null;
            if (current()) setToast('');
          }, 2400);
        } catch (err) {
          if (!current()) return;
          await refresh(`保存失败：${err.message}`);
        } finally {
          if (current()) setBusy(false);
        }
      }, [owner, refresh]);

      const dependentDisabled = busy || !writable || !config.enabled;

      return h('div', { className: 'dsh-tf-settings' },
        h('header', { className: 'dsh-tf-header' },
          h('div', { className: 'dsh-tf-title-row' },
            h('span', { className: 'dsh-tf-title-icon' }, h(Icon, { name: 'brain', size: 21 })),
            h('h1', { className: 'dsh-tf-title' }, '思考与折叠'),
            h('span', { className: 'dsh-tf-status', 'data-enabled': String(Boolean(config.enabled)) }, config.enabled ? '已启用' : '已停用')
          ),
          h('p', { className: 'dsh-tf-subtitle' }, '增强原生过程折叠，提供兼容折叠及底部、浮动收起按钮；不改变 AI 的指令与输出方式。')
        ),
        toast && h('div', { className: 'dsh-tf-feedback dsh-tf-toast', role: 'status' }, h(Icon, { name: 'check', size: 14 }), h('span', null, toast)),
        error && h('div', { className: 'dsh-tf-feedback dsh-tf-error', role: 'alert' }, h(Icon, { name: 'info', size: 14 }), h('span', null, error)),
        h('section', { className: 'dsh-tf-card', 'aria-labelledby': 'dsh-tf-runtime-title' },
          h('h2', { className: 'dsh-tf-card-title', id: 'dsh-tf-runtime-title' }, h(Icon, { name: 'sliders' }), '运行'),
          h(SettingRow, { label: '启用插件', description: '启用过程折叠增强，以及每段过程的底部收起和按可见位置显示的浮动收起按钮。' },
            h(Toggle, { label: '启用插件', checked: Boolean(config.enabled), disabled: busy || !writable, onChange: (value) => update({ enabled: value }) })
          ),
          h('div', { className: 'dsh-tf-assurance' },
            h(Icon, { name: 'info', size: 15 }),
            h('span', null, '普通轮次复用原生折叠；插话按段收起，中断保留最后的已输出回答与提示；仍在运行的当前段保持可见。')
          )
        ),
        h('section', { className: 'dsh-tf-card', 'aria-labelledby': 'dsh-tf-appearance-title' },
          h('h2', { className: 'dsh-tf-card-title', id: 'dsh-tf-appearance-title' }, h(Icon, { name: 'palette' }), '外观'),
          h(SettingRow, { label: '增强运行状态样式', description: '调整原生过程控件与新增折叠按钮的外观；关闭此项不影响底部、浮动及兼容折叠功能。' },
            h(Toggle, { label: '增强运行状态样式', checked: Boolean(config.showLiveHud), disabled: dependentDisabled, onChange: (value) => update({ showLiveHud: value }) })
          ),
          h(SettingRow, { label: '折叠按钮样式', description: '选择过程控件的显示密度与边框形式。' },
            h('select', {
              className: 'dsh-tf-select',
              value: config.foldStyle,
              disabled: dependentDisabled || !config.showLiveHud,
              'aria-label': '折叠按钮样式',
              onChange: (event) => update({ foldStyle: event.target.value })
            },
            h('option', { value: 'codex' }, '经典'),
            h('option', { value: 'minimal' }, '极简'),
            h('option', { value: 'clean' }, '清晰'))
          )
        ),
        h('div', { className: 'dsh-tf-assurance' },
          h(Icon, { name: 'shield', size: 15 }),
          h('span', null, '无指令注入 · 不搬移消息行 · 原生与兼容过程折叠')
        )
      );
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        disposeRuntimeOwner?.();
        clearRuntime();
        const owner = { cleanups: new Set(), settingsVersion: 0 };
        const style = mountStyles();
        const abort = new AbortController();
        let active = true;
        runtimeOwner = owner;
        if (style) style.__dshThoughtFoldOwner = owner;

        const version = ++owner.settingsVersion;
        requestSettings('GET', undefined, abort.signal)
          .then((payload) => {
            if (active && runtimeOwner === owner && owner.settingsVersion === version) {
              syncRuntimeAppearance({ ...DEFAULT_CONFIG, ...(payload.config || {}) }, owner);
            }
          })
          .catch(() => {
            if (active && runtimeOwner === owner && owner.settingsVersion === version) clearRuntime();
          });

        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
          name: 'conversation.composer.dock',
          id: 'thought-fold-controls',
          order: 100,
          inject: (sessionId) => ({ foldSessionId: sessionId })
        }, FoldDock));

        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'thought-fold',
          order: 15,
          label: () => '思考折叠'
        }, () => h(ThoughtFoldSettingsView, { owner })));

        const dispose = () => {
          if (!active) return;
          active = false;
          abort.abort();
          for (const cleanup of owner.cleanups) cleanup();
          if (runtimeOwner === owner) {
            runtimeOwner = null;
            clearRuntime();
          }
          if (disposeRuntimeOwner === dispose) disposeRuntimeOwner = null;
          if (style?.__dshThoughtFoldOwner === owner) {
            style.remove?.();
          }
        };
        disposeRuntimeOwner = dispose;
        if (typeof ctx.effect === 'function') {
          ctx.effect(() => dispose, 'dsh-thought-fold:client-lifecycle');
        }
        return dispose;
      }
    };
  }
});
