import KoiPlugin from "main";
import { App, normalizePath } from "obsidian";
import { RidBundle } from "rid-lib-types";
import type { KoiPluginSettings } from "settings";


export class RidStorage {
	plugin: KoiPlugin;
	app: App;
	settings: KoiPluginSettings;

    constructor(plugin: KoiPlugin) {
		this.plugin = plugin
		this.app = plugin.app;
		this.settings = plugin.settings;
    }

	async directoryExists() {
		return await this.app.vault.adapter.exists(
			this.settings.koiSyncDirectoryPath);
	}

	getRidPath(rid: string) {
		return normalizePath(
			`${this.settings.koiSyncDirectoryPath}/${btoa(rid)}.md`);
	}

	getRidFile(rid: string) {
		return this.app.vault.getFileByPath(this.getRidPath(rid));
	}

	async validateDirectory(): Promise<boolean> {
		if (!(await this.directoryExists())) {
			await this.app.vault.createFolder(
				this.settings.koiSyncDirectoryPath);

			return false;
		}

		return true;
	}

    async readAllRids() {
		if (!(await this.directoryExists()))
			return [];

        const rids = [];
		const paths = await this.app.vault.adapter.list(
			this.settings.koiSyncDirectoryPath);
		
		for (const filePath of paths.files) {
			// slice between prefix '<directory_name>/' and suffix '.md'
			const fileName = filePath.slice(
				this.settings.koiSyncDirectoryPath.length + 1, -3
			)
			const rid = atob(fileName);
			rids.push(rid);
		}

		return rids;
    }

	write(rid: string, bundle: RidBundle) {
		this.validateDirectory();

		const formattedText = this.plugin.handleBarTemplate(bundle.contents);
		
		this.app.vault.adapter.write(
			this.getRidPath(rid),
			formattedText
		);
	}

	delete(rid: string) {
		const file = this.getRidFile(rid);
		if (!file) return;
		this.app.vault.delete(file);
	}
}