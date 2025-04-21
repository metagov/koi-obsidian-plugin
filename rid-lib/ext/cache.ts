import KoiPlugin from "main";
import { App, TAbstractFile, TFile, TFolder, Vault } from "obsidian";
import { Bundle } from "./bundle";

export class Cache {
    app: App;
    directoryPath: string;

    constructor(plugin: KoiPlugin, directoryPath: string) {
        this.app = plugin.app;
        this.directoryPath = directoryPath + "/cache";
    }

    getFolderObject(): TFolder | null {
        return this.app.vault.getFolderByPath(
            this.directoryPath
        );
    }

    getFilePath(rid: string) {
        return `${this.directoryPath}/${btoa(rid)}.json`;
    }

    getFileObject(rid: string) {
        return this.app.vault.getFileByPath(
            this.getFilePath(rid)
        );
    }

    async write(bundle: Bundle): Promise<Bundle> {
        if (!this.app.vault.getFolderByPath(this.directoryPath) || !this.getFolderObject())
            await this.app.vault.createFolder(this.directoryPath)

        const file = this.getFileObject(bundle.rid);
        const bundleString = JSON.stringify(bundle);

        if (file) {
            await this.app.vault.process(file, () => bundleString);
        } else {
            await this.app.vault.create(this.getFilePath(bundle.rid), bundleString);
        }

        return bundle;
    }

    exists(rid: string): boolean {
        return this.getFileObject(rid) !== null;
    }

    async read(rid: string): Promise<Bundle | null> {
        try {
            const file = this.getFileObject(rid);
            if (!file) return null;
            const jsonString = await this.app.vault.read(file);
            return JSON.parse(jsonString);
        } catch (err) {
            return null;
        } 
    }

    listRids(ridTypes: Array<string> | null = null): Array<string> {
        const folder = this.getFolderObject();
        if (!folder) return [];

        let telescopeCount = 0;
        const rids: Array<string> = [];

        const files: Array<TFile> = [];
        Vault.recurseChildren(
            folder, 
            (file: TAbstractFile) => {
                if (file instanceof TFile) files.push(file);
            }
        )

        for (const file of files) {
            const rid = atob(file.basename);

            if (Array.isArray(ridTypes)) {
                for (const ridType of ridTypes) {
                    if (rid.startsWith(ridType)) {
                        rids.push(rid);
                        continue;
                    }
                }
            } else {
                rids.push(rid);
            }
        }
            
        return rids
    }

    async delete(rid: string) {
        const file = this.getFileObject(rid);
        if (file) await this.app.vault.delete(file);
    }

    async drop() {
        const folder = this.getFolderObject();
        if (folder) await this.app.vault.delete(folder, true);
    }
}