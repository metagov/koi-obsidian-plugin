import KoiPlugin from "main";
import { App, TAbstractFile, TFile, TFolder, Vault } from "obsidian";
import type { KoiPluginSettings } from "settings";
import type { RidBundle } from "telescope-types";

export class RidCache {
    plugin: KoiPlugin;
    app: App;
    settings: KoiPluginSettings;
    telescopeCount: number = 0;

    constructor(plugin: KoiPlugin) {
        this.plugin = plugin;
        this.app = plugin.app;
        this.settings = plugin.settings;
    }

    getFolderPath(): string {
        return this.settings.koiSyncFolderPath + "/cache";
    }

    getFolderObject(): TFolder | null {
        return this.app.vault.getFolderByPath(
            this.getFolderPath()
        );
    }

    getFilePath(rid: string) {
        return this.getFolderPath() + `/${btoa(rid)}.json`;
    }

    getFileObject(rid: string) {
        return this.app.vault.getFileByPath(
            this.getFilePath(rid)
        );
    }

    async write(rid: string, bundle: RidBundle) {
        if (!this.app.vault.getFolderByPath(
            this.settings.koiSyncFolderPath)
        ) {
            await this.app.vault.createFolder(
                this.settings.koiSyncFolderPath
            )
        }

        if (!this.getFolderObject()) {
            await this.app.vault.createFolder(
                this.getFolderPath()
            );
        }

        if (!this.exists(rid) && rid.startsWith("orn:telescope"))
            this.telescopeCount++;

        const file = this.getFileObject(rid);
        const bundleString = JSON.stringify(bundle);
        if (file) {
            await this.app.vault.process(file, () => bundleString);
        } else {
            await this.app.vault.create(this.getFilePath(rid), bundleString);
        }
    }

    exists(rid: string): boolean {
        return this.getFileObject(rid) !== null;
    }

    async read(rid: string): Promise<RidBundle | null> {
        try {
            const file = this.getFileObject(rid);
            if (!file) return null;
            const jsonString = await this.app.vault.read(file);
            return JSON.parse(jsonString);
        } catch (err) {
            return null;
        } 
    }

    listRids(): Array<string> {
        const folder = this.getFolderObject();
        if (!folder) {
            this.telescopeCount = 0;
            return [];
        }

        let telescopeCount = 0;
        const rids: Array<string> = [];

        const files: Array<TFile> = [];
        Vault.recurseChildren(
            folder, 
            (file: TAbstractFile) => {
                if (file instanceof TFile) 
                    files.push(file);
            }
        )

        // console.log(files.length, "files in cache");

        for (const file of files) {
            const rid = atob(file.basename);
            rids.push(rid);
            if (rid.startsWith("orn:telescope")) telescopeCount++;
                // console.log("mid read count", telescopeCount);
        }
            
        this.telescopeCount = telescopeCount;
        return rids
    }

    async delete(rid: string) {
        const file = this.getFileObject(rid);
        if (file) {
            await this.app.vault.delete(file);
            if (rid.startsWith("orn:telescope"))
                this.telescopeCount--;
        }
	}

    async drop() {
        const folder = this.getFolderObject();
        if (folder) await this.app.vault.delete(folder, true);
        this.telescopeCount = 0;
    }
}