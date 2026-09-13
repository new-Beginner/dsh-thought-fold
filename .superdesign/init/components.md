# Shared UI Components

The plugin ships one self-contained settings view in `client.js`; there is no external component library.

## Icon
- File: `client.js`
- Description: Inline stroke SVG icon used by the settings header, section headings, notices, and toast.
- Props: `name`, `size`

```js
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
```

## Toggle
- File: `client.js`
- Description: Native checkbox rendered as a compact switch.
- Props: `checked`, `onChange`, `disabled`

```js
function Toggle({ checked, onChange, disabled }) {
  return h('label', { className: 'dsh-tf-toggle' },
    h('input', { type: 'checkbox', checked, disabled, onChange: (event) => onChange(event.target.checked) }),
    h('span')
  );
}
```

## SettingRow
- File: `client.js`
- Description: Label and explanatory copy with a right-aligned control.
- Props: `label`, `description`, `children`

```js
function SettingRow({ label, description, children }) {
  return h('div', { className: 'dsh-tf-row' },
    h('div', { className: 'dsh-tf-row-copy' },
      h('div', { className: 'dsh-tf-label' }, label),
      h('div', { className: 'dsh-tf-desc' }, description)
    ),
    children
  );
}
```
