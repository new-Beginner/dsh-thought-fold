# Extractable Components

There are no cross-page layout components. The plugin exposes one settings page inside the DSH host shell.

## Toggle
- Source: `client.js`
- Category: basic
- Description: Compact native-checkbox switch used by every boolean setting.
- Extractable props: `checked`, `disabled`
- Hardcoded: CSS class and switch geometry

## SettingRow
- Source: `client.js`
- Category: basic
- Description: Repeated settings row with copy on the left and a control on the right.
- Extractable props: none; label, description, and child control are content slots
- Hardcoded: row layout and typography classes

These are basic primitives and should remain inline rather than be uploaded as Superdesign DraftComponents.
