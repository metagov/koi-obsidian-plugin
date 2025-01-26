import KoiPlugin from "main";
import { App } from "obsidian";
import type { KoiPluginSettings } from "settings";
import type { RidBundle } from "rid-lib-types";

export class RidCache {
    plugin: KoiPlugin;
    app: App;
    settings: KoiPluginSettings;
    length: number = 0;

    constructor(plugin: KoiPlugin) {
        this.plugin = plugin;
        this.app = plugin.app;
        this.settings = plugin.settings;
    }

    directoryPath(): string {
        return this.settings.koiSyncDirectoryPath + "/.cache";
    }

    filePathTo(rid: string) {
        return this.directoryPath() + `/${btoa(rid)}.json`;
    }

    async write(rid: string, bundle: RidBundle) {
        if (!(await this.app.vault.adapter.exists(this.settings.koiSyncDirectoryPath))) {
            await this.app.vault.createFolder(
                this.settings.koiSyncDirectoryPath
            )
        }

        if (!(await this.app.vault.adapter.exists(this.directoryPath()))) {
            await this.app.vault.createFolder(
                this.directoryPath()
            );
        }

        if (!(await this.exists(rid)))
            this.length++;

        await this.app.vault.adapter.write(
            this.filePathTo(rid),
            JSON.stringify(bundle)
        )

    }

    async exists(rid: string) {
        return await this.app.vault.adapter.exists(this.filePathTo(rid));
    }

    async read(rid: string): Promise<RidBundle | null> {
        try {
            const jsonString = await this.app.vault.adapter.read(this.filePathTo(rid));
            return JSON.parse(jsonString);
        } catch (err) {
            return null;
        } 
    }

    async readAllRids(): Promise<Array<string>> {
        if (!(await this.app.vault.adapter.exists(this.directoryPath())))
            return [];

        const rids: Array<string> = [];
        const paths = await this.app.vault.adapter.list(
            this.directoryPath());
        
            for (const filePath of paths.files) {
                const fileName = filePath.slice(
                    this.directoryPath().length + 1, -5)
                
                const rid = atob(fileName);
                rids.push(rid);
            }
            
        this.length = rids.length;

        return rids
    }

    async delete(rid: string) {
        if (await this.exists(rid)) {
            await this.app.vault.adapter.remove(this.filePathTo(rid));
            this.length--;
        }
	}

    async drop() {
        await this.app.vault.adapter.rmdir(this.directoryPath(), true);
        this.length = 0;
    }
}