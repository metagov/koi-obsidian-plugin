import { App, PluginSettingTab, Setting } from 'obsidian';
import type KoiPlugin from "main";
import { KoiNetConfigSchema } from 'koi-net/config';

export interface KoiPluginSettings {
    config: KoiNetConfigSchema;
	koiSyncFolderPath: string;
	templatePath: string;
    initialized: boolean;
}

export const DEFAULT_SETTINGS: KoiPluginSettings = {
    config: {
        node_name: "",
        node_rid: "",
        node_profile: {
            node_type: "PARTIAL",
            provides: {
                event: ["orn:obsidian.note"],
                state: []
            },
            public_key: ""
        },
        cache_directory_path: "rid_cache",
        polling_interval: 5,
        first_contact: {
            rid: null,
            url: null
        },
        priv_key: null
    },
	koiSyncFolderPath: "telescope",
	templatePath: "telescope-template.md",
    initialized: false,
    
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
                .setPlaceholder('orn:koi-net.node:...')
                .setValue(this.plugin.settings.config.node_rid || ''))
            .setDisabled(true);

        new Setting(containerEl)
            .setName('KOI-net first contact RID')
            .setDesc('RID of the KOI-net node this plugin will establish first contact with')
            .addText(text => text
                .setPlaceholder('orn:koi-net.node:...')
                .setValue(this.plugin.settings.config.first_contact.rid || '')
                .onChange(async (value) => {
                    this.plugin.settings.config.first_contact.rid = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('KOI-net first contact URL')
            .setDesc('URL of the KOI-net node this plugin will establish first contact with')
            .addText(text => text
                .setPlaceholder('https://')
                .setValue(this.plugin.settings.config.first_contact.url || '')
                .onChange(async (value) => {
                    this.plugin.settings.config.first_contact.url = value;
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
