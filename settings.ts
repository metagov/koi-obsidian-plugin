import { App, PluginSettingTab, Setting } from 'obsidian';
import type KoiPlugin from "main";

export interface KoiPluginSettings {
    nodeRid: string;
    firstContact: string;
    koiApiKey: string | null;
	koiSyncFolderPath: string;
	templatePath: string;
    nodeName: string;
    initialized: boolean;
}

export const DEFAULT_SETTINGS: KoiPluginSettings = {
	nodeRid: "",
    firstContact: "",
	koiApiKey: "",
	koiSyncFolderPath: "telescope",
	templatePath: "telescope-template.md",
    nodeName: "",
    initialized: false
}

export class KoiSettingTab extends PluginSettingTab {
    plugin: KoiPlugin;

    constructor(app: App, plugin: KoiPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;

        containerEl.empty();
        
        new Setting(containerEl)
            .setName('KOI-net node RID')
            .setDesc('The RID of this plugin\'s KOI-net node')
            .addText(text => text
                .setPlaceholder('')
                .setValue(this.plugin.settings.nodeRid))
            .setDisabled(true);

        new Setting(containerEl)
            .setName('KOI-net first contact')
            .setDesc('URL of the KOI-net node this plugin will establish initial communication with')
            .addText(text => text
                .setPlaceholder('https://...')
                .setValue(this.plugin.settings.firstContact)
                .onChange(async (value) => {
                    this.plugin.settings.firstContact = value;
                    await this.plugin.saveSettings();
                }));
        
        new Setting(containerEl)
            .setName('KOI-net API key')
            .setDesc('Optional API key for accessing protected KOI-net nodes')
            .addText(text => text
                .setValue(this.plugin.settings.koiApiKey || "")
                .onChange(async (value) => {
                    this.plugin.settings.koiApiKey = (value === "") ? null : value;
                    console.log(this.plugin.settings.koiApiKey);
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Sync directory path')
            .setDesc('Directory used to store RID objects synced through KOI')
            .addText(text => text
                .setPlaceholder('koi')
                .setValue(this.plugin.settings.koiSyncFolderPath)
                .onChange(async (value) => {
                    this.plugin.settings.koiSyncFolderPath = value;
                    await this.plugin.saveSettings();
                })
            )
        
        new Setting(containerEl)
            .setName('Template file location')
            .setDesc('Will be used to generate documents imported from KOI')
            .addText(text => text
                .setPlaceholder('')
                .setValue(this.plugin.settings.templatePath)
                .onChange(async (value) => {
                    this.plugin.settings.templatePath = value;
                    await this.plugin.fileFormatter.compileTemplate();
                    await this.plugin.saveSettings();
                }));
    }
}
