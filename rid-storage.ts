import { App, normalizePath } from "obsidian";
import { RidBundle } from "rid-lib-types";
import type { KoiPluginSettings } from "settings";


export class RidStorage {
	app: App;
	settings: KoiPluginSettings;

    constructor(app: App, settings: KoiPluginSettings) {
		this.app = app;
		this.settings = settings;
    }

	getRidPath(rid: string) {
		return normalizePath(
			`${this.settings.koiSyncDirectoryPath}/${btoa(rid)}.md`);
	}

	getRidFile(rid: string) {
		return this.app.vault.getAbstractFileByPath(this.getRidPath(rid));
	}

	validateDirectory(): boolean {
		const directory = this.app.vault.getFolderByPath(
			this.settings.koiSyncDirectoryPath);

		if (directory === null) {
			console.log("creating directory")
			this.app.vault.createFolder(
				this.settings.koiSyncDirectoryPath);

			return false;
		}

		return true;
	}

    async readAllRids() {
		this.validateDirectory();

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

		const msg_text = bundle.contents.text;
		delete bundle.contents.text;
		const text: string = "---\n" + JSON.stringify(bundle.contents) + "\n---\n>" + msg_text;

		this.app.vault.adapter.write(
			this.getRidPath(rid),
			text
		);
	}

	delete(rid: string) {
		const file = this.getRidFile(rid);
		if (file != null)
			this.app.vault.delete(file);
	}
}