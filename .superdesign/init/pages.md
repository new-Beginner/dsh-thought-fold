# Page Dependency Trees

## DSH Settings / Thought Fold
Entry: `client.js`
Dependencies:
- Host-provided `react`
- Inline `Icon`
- Inline `Toggle`
- Inline `SettingRow`
- Inline `ThoughtFoldSettingsView`
- Inline theme-aware CSS and lifecycle-managed `mountStyles`
- `requestSettings` -> `/api/dsh-thought-fold`
  - `src/web.js`
    - service provided by `index.js`
      - `src/config.js`
      - `src/web.js`

No standalone route, layout package, model-instruction module, CSS file, or UI library is used.
