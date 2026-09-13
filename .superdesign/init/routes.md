# Routes

This package has no standalone router. It is injected into the DSH Web settings shell.

## DSH Settings / Thought Fold
- Host route: DSH settings dialog (host-controlled URL)
- Slot: `settings.section`
- Section id: `thought-fold`
- Section label: `思考折叠`
- Component: `ThoughtFoldSettingsView` in `client.js`
- Host API: `GET|POST /api/dsh-thought-fold` registered by `src/web.js`
- Host plugin entry: `index.js`

```js
ctx.slots.inject('settings.section', () => ctx.slots.register({
  name: 'settings.section',
  id: 'thought-fold',
  order: 15,
  label: () => '思考折叠'
}, ThoughtFoldSettingsView));
```
