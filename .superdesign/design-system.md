# DSH Thought Fold Design System

## Product role
A compact settings surface for DSH users who want native process folding and a clearer running-state pill without model prompt injection or DOM rewriting.

## Existing host language
- Preserve the DSH settings dialog, left navigation, white/light surface, blue interactive accent, native system font, and thin neutral borders.
- Do not introduce a marketing-page aesthetic, decorative gradients, large illustrations, or heavyweight cards.

## Baseline tokens
- Canvas: `#FFFFFF`
- Quiet surface: `#F7F8FA`
- Primary text: `#171A1F`
- Secondary text: `#68707D`
- Border: `#E4E7EC`
- Accent: `#3B82F6`
- Success: `#16A34A`
- Info tint: `#EFF6FF`
- Font: `Inter, SF Pro Text, PingFang SC, Microsoft YaHei, system-ui, sans-serif`
- Title: 18px / 1.35 / 650
- Section title: 14px / 1.4 / 650
- Setting label: 14px / 1.45 / 600
- Supporting copy: 13px / 1.55 / 400
- Utility: 12px / 1.4 / 500
- Spacing rhythm: 4, 8, 12, 16, 20, 24, 32
- Radius: 8px controls, 12px cards, pill statuses
- Shadow: none by default; focus rings only

## Redesign direction
- One clear header row with icon, title, short supporting sentence, and compact status badge.
- Use a compact runtime card for the master enable control and a separate appearance card for running-state styling and appearance style.
- Keep model instruction behavior outside the plugin; remove the former injection controls and dark preview block entirely.
- Add a quiet assurance panel explaining that the plugin does not inject model instructions and only changes native process styling.
- Keep controls right aligned with fixed-width action columns; let text wrap naturally.
- At narrow widths, stack each setting control below the copy and shorten the sidebar label to prevent truncation.
- Native select must explicitly set `color-scheme`, foreground, surface, and option colors for both light and dark themes.

## Accessibility
- Visible `:focus-visible` rings using the blue accent.
- Toggle must retain an accessible native checkbox and an `aria-label`.
- Respect `prefers-reduced-motion`.
- Minimum control height 36px for selects and 24px for switches; no text smaller than 12px.
