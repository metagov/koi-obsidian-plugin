import KoiPlugin from "main";
import { App, normalizePath, stringifyYaml, TFile } from "obsidian";
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
				(match, userId) => path.replace(/\$userId/g, userId).replace(/\$userName/g, this.userNameLookup[userId] || userId)
			)
		})
	}

	async compileTemplate(): Promise<void> {
		const file = this.app.vault.getFileByPath(
			normalizePath(this.settings.templatePath));

		if (!file) {
			new Notice("Failed to compile HandleBar Template");
			return;
		}

		const templateString = await this.app.vault.read(file);
		this.handleBarTemplate = Handlebars.compile(templateString);
	}

	getFileName(rid: string): string {
		return btoa(rid) + ".md";
	};

	getFilePath(rid: string): string {
		return this.settings.koiSyncFolderPath + "/" + this.getFileName(rid);
	}

	getFileObject(rid: string): TFile | null {
		return this.app.vault.getFileByPath(
			this.getFilePath(rid)
		);
	}

	async rewriteAll(notice: Notice | null = null) {
		const telescopeRids = this.cache.readAllRids()
			.filter(str => str.startsWith("orn:telescoped"));
		let count = 0;
		for (const rid of telescopeRids) {
			await this.write(rid);
			count++;
			if (notice) notice.setMessage(`Formatting telescopes... (${count}/${telescopeRids.length})`);
		}
		if (notice) notice.setMessage(`Done formatting! (${count}/${telescopeRids.length})`);
	}

	async writeMultiple(rids: Array<string>) {
		const telescopeRids = rids.filter(rid => rid.startsWith("orn:telescoped"));
		const notice = new Notice("", 0);
		let count = 0;
		for (const rid of telescopeRids) {
			await this.write(rid);
			count++;
			if (notice) notice.setMessage(`Formatting telescopes... (${count}/${telescopeRids.length})`);
		}
		if (notice) notice.setMessage(`Done formatting! (${count}/${telescopeRids.length})`);

		setTimeout(() => {
			notice.hide();
		}, 3000);
	}

	async write(rid: string) {
		const bundle = await this.cache.read(rid);
		if (!bundle) return;

		const data = Object.assign({}, bundle.contents)
		data.obsidian_filename = this.getFileName(rid);
		data.obsidian_filepath = this.getFilePath(rid);
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
		
		const file = this.getFileObject(rid);
		if (file) {
			// console.log("modified file");
			await this.app.vault.modify(file, formattedOutput)
		} else {
			// console.log("created new file");
			await this.app.vault.create(this.getFilePath(rid), formattedOutput)
		}
	}

	async delete(rid: string) {
		const file = this.getFileObject(rid);
		if (file) await this.app.vault.delete(file);
	}

}