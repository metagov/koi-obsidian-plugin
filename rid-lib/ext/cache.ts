import KoiPlugin from "main";
import { App, TAbstractFile, TFile, TFolder, Vault } from "obsidian";
import { Bundle } from "./bundle";

export class KoiCache {
    vault: Vault;
    directoryPath: string;

    constructor(vault: Vault, directoryPath: string) {
        this.vault = vault;
        this.directoryPath = directoryPath + "/cache";
    }

    getFolderObject(): TFolder | null {
        return this.vault.getFolderByPath(
            this.directoryPath
        );
    }

    getFilePath(rid: string) {
        return `${this.directoryPath}/${btoa(rid)}.json`;
    }

    getFileObject(rid: string) {
        return this.vault.getFileByPath(
            this.getFilePath(rid)
        );
    }

    async write(bundle: Bundle): Promise<Bundle> {
        if (!this.vault.getFolderByPath(this.directoryPath) || !this.getFolderObject())
            await this.vault.createFolder(this.directoryPath)

        const file = this.getFileObject(bundle.rid);
        const bundleString = JSON.stringify(bundle);

        if (file) {
            await this.vault.process(file, () => bundleString);
        } else {
            await this.vault.create(this.getFilePath(bundle.rid), bundleString);
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
            const jsonString = await this.vault.read(file);
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
        if (file) await this.vault.delete(file);
    }

    async drop() {
        const folder = this.getFolderObject();
        if (folder) await this.vault.delete(folder, true);
    }
}