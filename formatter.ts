import KoiPlugin from "main";
import { App, normalizePath, stringifyYaml, TFile } from "obsidian";
import { RidBundle } from "rid-lib-types";
import type { KoiPluginSettings } from "settings";
import * as Handlebars from 'handlebars';
import { Notice } from "obsidian";
import { RidCache } from "rid-cache";
import { Effector } from "effector";


export class TelescopeFormatter {
	plugin: KoiPlugin;
	app: App;
	settings: KoiPluginSettings;
	cache: RidCache;
	effector: Effector;
	handleBarTemplate: Handlebars.TemplateDelegate;

	constructor(plugin: KoiPlugin, cache: RidCache, effector: Effector) {
		this.plugin = plugin;
        this.app = plugin.app;
        this.settings = plugin.settings;
		this.cache = cache;
		this.effector = effector;

		Handlebars.registerHelper("json", (data) => JSON.stringify(data));
		Handlebars.registerHelper("yaml", (data) => stringifyYaml(data));
		Handlebars.registerHelper("stringPrefix", (prefixLength: number, data: string) => {
			if (data.length > prefixLength) {
				return data.substring(0, prefixLength - 3) + "...";
			} else {
				return data;
			}
		});
		Handlebars.registerHelper("parseUsers", function (path: string, text: string) {
			return text.replace(
				/<@([A-Z0-9]+)>/g,
				(match, userId) => path.replace("$userId", userId).replace("$userName", this.userNameLookup[userId] || userId)
			)
		})
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

	fileName(rid: string) {
		return btoa(rid) + ".md";
	};

	filePathTo(rid: string) {
		return this.settings.koiSyncDirectoryPath + "/" + this.fileName(rid);
	}

	async rewriteAll() {
		for (const rid of (await this.cache.readAllRids())) {
			if (!rid.startsWith("orn:telescoped:")) continue;
			await this.write(rid);
		}
	}

	async write(rid: string) {
		const bundle = await this.cache.read(rid);
		if (!bundle) return;

		const data = Object.assign({}, bundle.contents)
		data.obsidian_filename = this.fileName(rid);
		data.obsidian_filepath = this.filePathTo(rid);
		const rawText = <string>bundle.contents.text;

		const captureUserId = /<@([A-Z0-9]+)>/g;
		const userNameLookup: Record<string, string | unknown> = {};
		const userIds = [...rawText.matchAll(captureUserId)].map(m => m[1]);
		for (const userId of userIds) {
			const userRid = `orn:slack.user:${data.team_id}/${userId}`
			const bundle = await this.effector.dereference(userRid);
			userNameLookup[userId] = bundle?.contents.real_name;
		}
		data.userNameLookup = userNameLookup;

		const formattedOutput = this.handleBarTemplate(data);
		
		await this.app.vault.adapter.write(
			this.filePathTo(rid),
			formattedOutput
		);
	}

	async delete(rid: string) {
		await this.app.vault.adapter.remove(this.filePathTo(rid));
	}

}