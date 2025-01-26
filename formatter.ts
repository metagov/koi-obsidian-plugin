import KoiPlugin from "main";
import { App, normalizePath, stringifyYaml, TFile } from "obsidian";
import { RidBundle } from "rid-lib-types";
import type { KoiPluginSettings } from "settings";
import * as Handlebars from 'handlebars';
import { Notice } from "obsidian";
import { RidCache } from "rid-cache";


export class TelescopeFormatter {
	plugin: KoiPlugin;
	app: App;
	settings: KoiPluginSettings;
	cache: RidCache;
	handleBarTemplate: Handlebars.TemplateDelegate;

	constructor(plugin: KoiPlugin, cache: RidCache) {
		this.plugin = plugin;
        this.app = plugin.app;
        this.settings = plugin.settings;
		this.cache = cache;

		Handlebars.registerHelper("json", (data) => JSON.stringify(data));
		Handlebars.registerHelper("yaml", (data) => stringifyYaml(data));
		Handlebars.registerHelper("stringPrefix", (data: string) => data.substring(0, 50) + "...");
	}

	async compileTemplate() {
		const file = this.app.vault.getFileByPath(
			normalizePath(this.settings.templatePath));

		if (!file) {
			new Notice("Failed to compile HandleBar Template");
			return;
		}

		const templateString = await this.app.vault.read(file);
		this.handleBarTemplate = Handlebars.compile(templateString);
	}

	filePathTo(rid: string) {
		return this.settings.koiSyncDirectoryPath + `/${btoa(rid)}.md`;
	}

	async rewriteAll() {
		for (const rid of (await this.cache.readAllRids())) {
			await this.write(rid);
		}
	}

	async write(rid: string) {
		const bundle = await this.cache.read(rid);
		if (!bundle) return;

		const formattedText = this.handleBarTemplate(bundle.contents);
		
		await this.app.vault.adapter.write(
			this.filePathTo(rid),
			formattedText
		);
	}

	async delete(rid: string) {
		await this.app.vault.adapter.remove(this.filePathTo(rid));
	}

}