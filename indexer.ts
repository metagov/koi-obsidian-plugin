import { randomUUID } from "crypto";
import { NodeInterface } from "koi-net/core";
import { EventType } from "koi-net/protocol/event";
import KoiPlugin from "main";
import { App, TFile } from "obsidian";
import { Bundle } from "rid-lib/ext/bundle";
import { KoiPluginSettings } from "settings";

export class Indexer {
    app: App;
    settings: KoiPluginSettings;
    node: NodeInterface;
    fileIndex: Record<string, string>;

    constructor(plugin: KoiPlugin) {
        this.app = plugin.app
        this.settings = plugin.settings;
        this.node = plugin.node;
        this.fileIndex = {};
    }

    async indexNotes() {
        console.log("indexing notes...");
        for (const file of this.app.vault.getMarkdownFiles()) {
            await this.app.fileManager.processFrontMatter(
                file,
                async (frontmatter) => {
                    if (!frontmatter?.rid || !frontmatter?.koi_net_enabled)
                        return;

                    this.fileIndex[file.path] = frontmatter.rid;
                    console.log(file.path, "->", frontmatter.rid);

                    // const metadata = this.app.metadataCache.getFileCache(file);
                    // console.log(metadata?.links);

                    await this.handleFile(file);
                }
            )
        }
        console.log(this.fileIndex);
    }

    listRids() {
        return Object.values(this.fileIndex);
    }

    async modifyNote(file: TFile) {
        if (file.parent?.name === this.settings.koiSyncFolderPath)
            return;

        if (!(file.path in this.fileIndex))
            return;
        
        console.log("modifying note")

        await this.handleFile(file);
    }

    async renameNote(file: TFile, oldPath: string) {
        if (!(oldPath in this.fileIndex)) return;
        console.log(`renaming note ${oldPath} -> ${file.path}`);

        const rid = this.fileIndex[oldPath];
        delete this.fileIndex[oldPath];
        this.fileIndex[file.path] = rid;
        await this.handleFile(file);
    }

    async deleteNote(file: TFile) {
        if (!(file.path in this.fileIndex)) return;
        console.log("deleting note", file.path);

        this.node.processor.handle({
            rid: this.fileIndex[file.path],
            eventType: EventType.enum.FORGET
        });
        delete this.fileIndex[file.path];
    }

    async trackFile(file: TFile) {
        await this.app.fileManager.processFrontMatter(
            file,
            async (frontmatter) => {
                if (!frontmatter.rid)
                    frontmatter.rid = `orn:obsidian.note:${this.settings.vaultId}/${randomUUID()}`;

                frontmatter.koi_net_enabled = true;

                this.fileIndex[file.path] = frontmatter.rid;

                await this.handleFile(file);
            }
        );
    }

    async handleFile(file: TFile) {
        await this.app.fileManager.processFrontMatter(
            file,
            async (frontmatter) => {
                console.log("frontmatter!", frontmatter);

                if (frontmatter.koi_net_enabled === false) {
                    console.log("forgetting", frontmatter.rid);
                    this.node.processor.handle({
                        rid: frontmatter.rid,
                        eventType: EventType.enum.FORGET
                    });
                } else {
                    const data = await this.app.vault.read(file);
                    delete frontmatter.koi_net_enabled;

                    const text = data.replace(/^---[\s\S]*?---\n?/, '');

                    // console.log(data);
                    // console.log(text);

                    const contents = {
                        text,
                        frontmatter,
                        basename: file.basename,
                        path: file.path
                    }

                    this.node.processor.handle({
                        bundle: Bundle.generate({
                            rid: frontmatter.rid, contents
                        })
                    });
                }
                await this.node.processor.flushKobjQueue();
            }
        );
    }
}