import {
  Plugin,
  TFile,
  PluginSettingTab,
  Setting,
  Menu,
  Notice,
} from "obsidian";
import { around, dedupe } from "monkey-around";

const DEFAULT_SETTINGS = {
  properties: [
    { name: "Date Created", type: "datetime", value: "now" },
    { name: "Related To", type: "list", value: "" },
  ],
};

// Turn a configured property into the value written to frontmatter.
function computeValue(prop) {
  const raw = (prop.value ?? "").trim();
  const lower = raw.toLowerCase();
  switch (prop.type) {
    case "datetime":
      if (raw === "" || lower === "now") {
        return window.moment().format("YYYY-MM-DDTHH:mm:ss");
      }
      return raw;
    case "date":
      if (raw === "" || lower === "now" || lower === "today") {
        return window.moment().format("YYYY-MM-DD");
      }
      return raw;
    case "number": {
      const n = Number(raw);
      return Number.isNaN(n) ? 0 : n;
    }
    case "checkbox":
      return lower === "true" || lower === "yes" || lower === "1";
    case "list":
      if (raw === "") return [];
      return raw.split(",").map((s) => s.trim()).filter((s) => s.length);
    case "text":
    default:
      return raw;
  }
}

export default class StickyPropertiesPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new StickyPropertiesSettingTab(this.app, this));
    this.patchPropertyMenu();

    // Wait until the vault is fully loaded, otherwise the "create" event fires
    // once per existing note while Obsidian indexes the vault on startup.
    this.app.workspace.onLayoutReady(() => {
      this.registerEvent(
        this.app.vault.on("create", (file) => {
          if (file instanceof TFile && file.extension === "md") {
            this.addProperties(file);
          }
        })
      );
    });
  }

  async addProperties(file) {
    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      for (const prop of this.settings.properties) {
        const name = (prop.name ?? "").trim();
        if (name === "") continue; // skip unnamed rows
        if (frontmatter[name] === undefined) {
          frontmatter[name] = computeValue(prop);
        }
      }
    });
  }

  // Wrap Menu.prototype.showAtMouseEvent so that when the native property
  // context menu is about to open, we inject our own "auto-add" toggle.
  // This is the same approach Pretty Properties uses: detect the clicked
  // property from the DOM (.metadata-property / data-property-key) and add
  // items via the public menu.addItem() API.
  //
  // monkey-around's `around` returns an uninstaller (registered for cleanup on
  // unload) and `dedupe` keeps the patch safe when the plugin reloads or when
  // multiple plugins patch the same method.
  patchPropertyMenu() {
    const plugin = this;
    const uninstall = around(Menu.prototype, {
      showAtMouseEvent(original) {
        return dedupe("sticky-properties-menu", original, function (event) {
          try {
            const target = event && event.target;
            if (
              target instanceof Element &&
              target.closest(".metadata-property-icon")
            ) {
              const propEl = target.closest(".metadata-property");
              const propName = propEl && propEl.getAttribute("data-property-key");
              if (propName) {
                plugin.addPropertyMenuItems(this, propName);
              }
            }
          } catch (e) {
            console.error("Sticky Properties: menu patch error", e);
          }
          return original.apply(this, arguments);
        });
      },
    });
    this.register(uninstall);
  }

  addPropertyMenuItems(menu, propName) {
    const key = propName.trim().toLowerCase();
    const existing = this.settings.properties.find(
      (p) => (p.name || "").trim().toLowerCase() === key
    );

    menu.addItem((item) => {
      item.setSection("sticky-properties");
      if (existing) {
        item
          .setTitle("Remove from auto-add")
          .setIcon("lucide-circle-x")
          .onClick(async () => {
            this.settings.properties = this.settings.properties.filter(
              (p) => (p.name || "").trim().toLowerCase() !== key
            );
            await this.saveSettings();
            new Notice(`"${propName}" will no longer be auto-added to new notes`);
          });
      } else {
        item
          .setTitle("Auto-add to new notes")
          .setIcon("lucide-circle-plus")
          .onClick(async () => {
            const type = this.inferType(propName);
            const value = type === "date" || type === "datetime" ? "now" : "";
            this.settings.properties.push({ name: propName, type, value });
            await this.saveSettings();
            new Notice(`"${propName}" will be added to new notes`);
          });
      }
    });
  }

  // Map Obsidian's registered property type to our setting types.
  inferType(propName) {
    try {
      const mtm = this.app.metadataTypeManager;
      const t = mtm && mtm.getAssignedType ? mtm.getAssignedType(propName) : null;
      switch (t) {
        case "multitext":
        case "tags":
        case "aliases":
          return "list";
        case "number":
          return "number";
        case "checkbox":
          return "checkbox";
        case "date":
          return "date";
        case "datetime":
          return "datetime";
        default:
          return "text";
      }
    } catch (e) {
      return "text";
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class StickyPropertiesSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("p", {
      text: "These properties are added to every new note. For Date/Date & time, use \"now\" (or \"today\") to stamp the moment the note is created. For List, separate default values with commas.",
      cls: "setting-item-description",
    });

    this.plugin.settings.properties.forEach((prop, index) => {
      const setting = new Setting(containerEl);

      setting.addText((text) =>
        text
          .setPlaceholder("Property name")
          .setValue(prop.name)
          .onChange(async (value) => {
            prop.name = value;
            await this.plugin.saveSettings();
          })
      );

      setting.addDropdown((dd) =>
        dd
          .addOption("text", "Text")
          .addOption("list", "List")
          .addOption("number", "Number")
          .addOption("checkbox", "Checkbox")
          .addOption("date", "Date")
          .addOption("datetime", "Date & time")
          .setValue(prop.type)
          .onChange(async (value) => {
            prop.type = value;
            await this.plugin.saveSettings();
            this.display(); // refresh so the value hint matches the new type
          })
      );

      setting.addText((text) =>
        text
          .setPlaceholder(this.valuePlaceholder(prop.type))
          .setValue(prop.value)
          .onChange(async (value) => {
            prop.value = value;
            await this.plugin.saveSettings();
          })
      );

      setting.addExtraButton((btn) =>
        btn
          .setIcon("trash")
          .setTooltip("Remove this property")
          .onClick(async () => {
            this.plugin.settings.properties.splice(index, 1);
            await this.plugin.saveSettings();
            this.display();
          })
      );
    });

    new Setting(containerEl).addButton((btn) =>
      btn
        .setButtonText("Add property")
        .setCta()
        .onClick(async () => {
          this.plugin.settings.properties.push({ name: "", type: "text", value: "" });
          await this.plugin.saveSettings();
          this.display();
        })
    );
  }

  valuePlaceholder(type) {
    switch (type) {
      case "datetime":
      case "date":
        return 'Default value (or "now")';
      case "list":
        return "Comma-separated defaults (optional)";
      case "number":
        return "0";
      case "checkbox":
        return "true / false";
      default:
        return "Default value (optional)";
    }
  }
}
