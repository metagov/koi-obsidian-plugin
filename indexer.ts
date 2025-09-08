import { KOI_NET_ENABLED_FIELD, OBSIDIAN_NOTE_TYPE, RID_FIELD } from "consts";
import { randomUUID } from "crypto";
import { NodeInterface } from "koi-net/core";
import { EventType } from "koi-net/protocol/event";
import KoiPlugin from "main";
import { ObsidianNote } from "models";
import { App, Notice, TFile } from "obsidian";
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
            const metadata = this.app.metadataCache.getFileCache(file);
            const frontmatter = metadata?.frontmatter;
            
            if (
                !frontmatter?.hasOwnProperty(RID_FIELD) || 
                !frontmatter?.hasOwnProperty(KOI_NET_ENABLED_FIELD)
            )
                continue;

            this.fileIndex[file.path] = frontmatter[RID_FIELD];
            console.log(file.path, "->", frontmatter[RID_FIELD]);
            
            await this.handleFile(file);
        }
        console.log(this.fileIndex);
    }

    listRids(): Array<string> {
        const rids = [];
        for (const [filePath, rid] of Object.entries(this.fileIndex)) {
            if (rid)
                rids.push(rid);
        }
        return rids;
    }

    async modifyNote(file: TFile) {
        if (file.parent?.name === this.settings.koiSyncFolderPath)
            return;

        if (!(file.path in this.fileIndex))
            return;
        
        console.log(`modifying note ${file.path}`);

        // new Notice("KOI-net: note modified");

        await this.handleFile(file);
    }

    async renameNote(file: TFile, oldPath: string) {
        if (!(oldPath in this.fileIndex)) return;
        console.log(`renaming note ${oldPath} -> ${file.path}`);
        new Notice("KOI-net: note renamed");

        const rid = this.fileIndex[oldPath];
        delete this.fileIndex[oldPath];
        this.fileIndex[file.path] = rid;
        await this.handleFile(file);
    }

    async deleteNote(file: TFile) {
        if (!(file.path in this.fileIndex)) return;
        console.log("deleting note", file.path);
        new Notice("KOI-net: note deleted");

        this.node.processor.handle({
            rid: this.fileIndex[file.path],
            eventType: EventType.enum.FORGET
        });
        delete this.fileIndex[file.path];
    }

    async trackFile(file: TFile) {
        // new Notice("KOI-net: note tracked");
        await this.app.fileManager.processFrontMatter(
            file,
            async (frontmatter) => {
                if (!frontmatter[RID_FIELD])
                    frontmatter[RID_FIELD] = `${OBSIDIAN_NOTE_TYPE}:${this.settings.vaultId}/${randomUUID()}`;

                frontmatter[KOI_NET_ENABLED_FIELD] = true;

                this.fileIndex[file.path] = frontmatter[RID_FIELD];
            }
        );
        await this.handleFile(file);
    }

    async handleFile(file: TFile) {
       await this.app.fileManager.processFrontMatter(
            file,
            async (frontmatter) => {
                if (!frontmatter) {
                    console.log("didn't find frontmatter");
                    return;
                } 
                
                if (frontmatter[KOI_NET_ENABLED_FIELD] === false) {
                    console.log("forgetting", frontmatter[RID_FIELD]);
                    new Notice("KOI-net: note untracked");
                    this.node.processor.handle({
                        rid: frontmatter[RID_FIELD],
                        eventType: EventType.enum.FORGET
                    });
                } else {
                    const data = await this.app.vault.read(file);
                    delete frontmatter[KOI_NET_ENABLED_FIELD];

                    if (!this.node.cache.exists(frontmatter[RID_FIELD]))
                    //     new Notice("KOI-net: note modified");
                    // else
                        new Notice("KOI-net: note tracked");

                    const text = data.replace(/^---[\s\S]*?---\n?/, '');

                    // console.log(data);
                    // console.log(text);

                    const contents = ObsidianNote.parse({
                        text,
                        frontmatter,
                        basename: file.basename,
                        path: file.path
                    });

                    this.node.processor.handle({
                        bundle: Bundle.generate({
                            rid: frontmatter[RID_FIELD], contents
                        })
                    });
                }
                await this.node.processor.flushKobjQueue();
            }
        )
    }
}