# Sticky Properties

An [Obsidian](https://obsidian.md) plugin that adds a configurable set of properties to **every new note** — so the frontmatter you always want is there from the moment a note is created.

Mark a property as "sticky" once, and it shows up on every note you make from then on.

## Features

- **Auto-stamp new notes** — every newly created note gets your configured properties added automatically.
- **Right-click to make a property sticky** — set up a property on any note, right-click it, and choose **Auto-add to new notes**. Right-click again to remove it. The property's type is detected automatically.
- **Configurable defaults** — in the settings tab, set each property's type (Text, List, Number, Checkbox, Date, Date & time) and a default value.
- **Smart date stamping** — give a Date or Date & time property the value `now` (or `today`) and each new note records its exact creation moment.
- **Non-destructive** — if a note already has one of your properties, its existing value is left untouched.

## How to use

1. Enable **Sticky Properties** in **Settings → Community plugins**.
2. Open **Settings → Sticky Properties** and add the properties you want on every new note, or:
3. On any note, add a property in the Properties panel, **right-click its icon**, and choose **Auto-add to new notes**.
4. Create a new note — your properties appear automatically.

### Tips

- For a **Date** or **Date & time** property, use `now` (or `today`) as the default to stamp the creation date/timestamp (e.g. `2026-06-25T13:00:00`). Leave the default **blank** to add an empty date property to fill in manually later.
- For a **List** property, separate default values with commas, or leave it blank for an empty list to fill in later.

## Installation

### From Community Plugins (once approved)

Search for **Sticky Properties** in **Settings → Community plugins → Browse**, install, and enable.

### Manual

1. Download `main.js`, `manifest.json`, and `versions.json` from the latest [release](../../releases).
2. Copy them into `<your-vault>/.obsidian/plugins/sticky-properties/`.
3. Reload Obsidian and enable the plugin under **Community plugins**.

## Notes

The right-click menu item is added by detecting the property element in the Properties panel and extending Obsidian's native context menu. It relies on Obsidian's internal markup; if a future Obsidian update changes that markup, the menu item may stop appearing (the automatic stamping of new notes will keep working regardless).

## Development

The source lives in `src/main.js` and is bundled into `main.js` with [esbuild](https://esbuild.github.io/).

```bash
npm install
npm run dev    # watch + rebuild on change
npm run build  # one-off production build
```

The right-click menu item is implemented with [`monkey-around`](https://github.com/pjeby/monkey-around), which safely wraps Obsidian's `Menu.prototype.showAtMouseEvent` and cleanly removes the patch on unload.

## License

[MIT](LICENSE)
