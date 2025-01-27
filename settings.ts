import { App, PluginSettingTab, Setting } from 'obsidian';
import type KoiPlugin from "main";

export interface KoiPluginSettings {
	koiApiUrl: string;
	koiApiKey: string;
	koiApiSubscriberId: string;
	koiSyncDirectoryPath: string;
	templatePath: string;
    initialized: boolean;
}

export const DEFAULT_SETTINGS: KoiPluginSettings = {
	koiApiUrl: "https://telescope-koi.lukvmil.com",
	koiApiKey: "",
	koiApiSubscriberId: "",
	koiSyncDirectoryPath: "telescope",
	templatePath: "telescope-template.md",
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
            .setName('KOI API URL')
            .setDesc('URL of the KOI API this plugin will communicate with')
            .addText(text => text
                .setPlaceholder('https://...')
                .setValue(this.plugin.settings.koiApiUrl)
                .onChange(async (value) => {
                    this.plugin.settings.koiApiUrl = value;
                    await this.plugin.saveSettings();
                }));
        
        new Setting(containerEl)
            .setName('KOI API Key')
            .setDesc('Key for accessing KOI API')
            .addText(text => text
                .setPlaceholder('')
                .setValue(this.plugin.settings.koiApiKey)
                .onChange(async (value) => {
                    this.plugin.settings.koiApiKey = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('KOI API Subscriber ID')
            .setDesc('Subscriber ID for receiving RID events (set automatically)')
            .addText(text => text
                .setPlaceholder('')
                .setValue(this.plugin.settings.koiApiSubscriberId
            ))
            .setDisabled(true);

        new Setting(containerEl)
            .setName('KOI Sync Directory Path')
            .setDesc('Directory used to store RID objects synced through KOI')
            .addText(text => text
                .setPlaceholder('koi')
                .setValue(this.plugin.settings.koiSyncDirectoryPath)
                .onChange(async (value) => {
                    this.plugin.settings.koiSyncDirectoryPath = value;
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
