# Shared Layouts

The DSH host provides the settings dialog, left navigation, toolbar, scroll container, and theme variables. This plugin injects one self-contained content panel.

## ThoughtFoldSettingsView
- File: `client.js`
- Slot: `settings.section`
- Section id: `thought-fold`
- Navigation label: `思考折叠`
- Description: Responsive two-group settings panel. Runtime contains the master switch and an honest DSH Compact Transcript note; Appearance contains the live-style switch and three visual variants. The panel has no model-instruction editor or preview.

```js
function ThoughtFoldSettingsView() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [busy, setBusy] = useState(true);
  const [writable, setWritable] = useState(true);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const payload = await requestSettings();
      const nextConfig = { ...DEFAULT_CONFIG, ...(payload.config || {}) };
      setConfig(nextConfig);
      setWritable(payload.writable !== false);
      syncRuntimeAppearance(nextConfig);
      setError(payload.writable === false ? '设置服务不可用，当前配置为只读状态。' : '');
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
      const nextConfig = { ...DEFAULT_CONFIG, ...(payload.config || {}) };
      setConfig(nextConfig);
      syncRuntimeAppearance(nextConfig);
      setToast('设置已保存并立即生效。');
      setError('');
      window.setTimeout(() => setToast(''), 2400);
    } catch (err) {
      setError(`保存失败：${err.message}`);
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const dependentDisabled = busy || !writable || !config.enabled;

  return h('div', { className: 'dsh-tf-settings' },
    h('header', { className: 'dsh-tf-header' },
      h('div', { className: 'dsh-tf-title-row' },
        h('span', { className: 'dsh-tf-title-icon' }, h(Icon, { name: 'brain', size: 21 })),
        h('h1', { className: 'dsh-tf-title' }, '思考与折叠'),
        h('span', { className: 'dsh-tf-status', 'data-enabled': String(Boolean(config.enabled)) }, config.enabled ? '已启用' : '已停用')
      ),
      h('p', { className: 'dsh-tf-subtitle' }, '仅增强 DSH 原生过程控件，AI 的指令与输出方式保持不变。')
    ),
    h('section', { className: 'dsh-tf-card' },
      h('h2', { className: 'dsh-tf-card-title' }, h(Icon, { name: 'sliders' }), '运行'),
      h(SettingRow, { label: '启用插件', description: '启用 DSH 原生过程控件的运行状态与折叠按钮样式。' },
        h(Toggle, { label: '启用插件', checked: Boolean(config.enabled), disabled: busy || !writable, onChange: (value) => update({ enabled: value }) })
      )
    ),
    h('section', { className: 'dsh-tf-card' },
      h('h2', { className: 'dsh-tf-card-title' }, h(Icon, { name: 'palette' }), '外观'),
      h(SettingRow, { label: '增强运行状态样式', description: '使用静态 CSS 优化工具调用与过程折叠控件。' },
        h(Toggle, { label: '增强运行状态样式', checked: Boolean(config.showLiveHud), disabled: dependentDisabled, onChange: (value) => update({ showLiveHud: value }) })
      ),
      h(SettingRow, { label: '折叠按钮样式', description: '选择过程控件的显示密度与边框形式。' },
        h('select', { className: 'dsh-tf-select', value: config.foldStyle, disabled: dependentDisabled || !config.showLiveHud },
          h('option', { value: 'codex' }, '经典'),
          h('option', { value: 'minimal' }, '极简'),
          h('option', { value: 'clean' }, '清晰'))
      )
    )
  );
}
```
