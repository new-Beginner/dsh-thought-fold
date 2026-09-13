# Theme

## Compact token summary

The plugin inherits the active DSH theme and never overrides the document or control color scheme.

- Panel background: `var(--dsw-alias-bg-layer-1, #fff)`
- Quiet background: `var(--dsw-alias-bg-layer-2, #f7f8fa)`
- Primary text: `var(--dsw-alias-label-primary, #1f2328)`
- Secondary text: `var(--dsw-alias-label-secondary, #68707d)`
- Tertiary text: `var(--dsw-alias-label-tertiary, #8b93a1)`
- Border: `var(--dsw-alias-border-l2, #e5e7eb)`
- Accent: `var(--dsw-alias-brand-primary, #4f6ef7)`
- Success foreground: `var(--dsw-alias-state-success-primary, #16803d)`
- Success background: `var(--dsw-alias-state-success-tertiary, rgba(22,163,74,.09))`
- Width: `720px`; card padding: `20px 22px`
- Font sizes: title `18px`, labels/section headings `14px`, descriptions `13px`, utility `12px`
- Line heights: title `1.35`, labels `1.45`, body `1.55`
- Radius: controls `8px`, cards `12px`, status pill `999px`
- Breakpoints: `640px` compact spacing; `480px` stacked controls

## Actual settings CSS excerpts

```css
.dsh-tf-settings {
  --tf-bg: var(--dsw-alias-bg-layer-1, #fff);
  --tf-bg-soft: var(--dsw-alias-bg-layer-2, #f7f8fa);
  --tf-text: var(--dsw-alias-label-primary, #1f2328);
  --tf-muted: var(--dsw-alias-label-secondary, #68707d);
  --tf-border: var(--dsw-alias-border-l2, #e5e7eb);
  --tf-accent: var(--dsw-alias-brand-primary, #4f6ef7);
  width: 100%; max-width: 720px; min-width: 0; margin: 0 auto;
}
.dsh-tf-title {
  min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 18px; font-weight: 650; line-height: 1.35;
}
.dsh-tf-card {
  margin: 0 0 16px; padding: 20px 22px;
  border: 1px solid var(--tf-border); border-radius: 12px; background: var(--tf-bg);
}
.dsh-tf-label { font-size: 14px; font-weight: 600; line-height: 1.45; }
.dsh-tf-desc { margin-top: 4px; color: var(--tf-muted); font-size: 13px; line-height: 1.55; }
.dsh-tf-select {
  width: 160px; height: 36px; border: 1px solid var(--tf-border);
  border-radius: 8px; background-color: var(--tf-bg); color: var(--tf-text);
}
.dsh-tf-select option { background-color: var(--tf-bg); color: var(--tf-text); }
@media (max-width: 480px) {
  .dsh-tf-row { flex-direction: column; }
  .dsh-tf-control, .dsh-tf-select { width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .dsh-tf-toggle span, .dsh-tf-toggle span::before { transition: none !important; }
}
```
