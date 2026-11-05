import { KOI_NET_ENABLED_FIELD, OBSIDIAN_NOTE_TYPE, RID_FIELD } from "consts";
import { randomUUID } from "crypto";
import { NodeInterface } from "koi-net/core";
import { EventType } from "koi-net/protocol/event";
import KoiPlugin from "main";
import { ObsidianNote } from "models";
import { App, getFrontMatterInfo, Notice, parseYaml, TFile } from "obsidian";
import { Bundle } from "rid-lib/ext/bundle";
import { parseRidString } from "rid-lib/utils";
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
            
            await this.handleFile(file, false);
        }
        console.log(this.fileIndex);
    }

    // forgets this vault's cached notes whose files no longer exist, e.g. ones
    // deleted while the plugin wasn't running or while syncing was paused
    async forgetDeletedNotes() {
        const trackedRids = new Set(Object.values(this.fileIndex));

        for (const rid of this.node.cache.listRids([OBSIDIAN_NOTE_TYPE])) {
            const { reference } = parseRidString(rid);
            if (!reference?.startsWith(`${this.settings.vaultId}/`)) continue;
            if (trackedRids.has(rid)) continue;

            // the metadata cache may not have indexed every note at startup, so
            // only forget notes whose last known file is also gone
            const bundle = await this.node.cache.read(rid);
            const path = bundle?.contents.path;
            if (typeof path === "string" && this.app.vault.getFileByPath(path)) continue;

            console.log("forgetting deleted note", rid);
            this.node.processor.handle({
                rid,
                eventType: EventType.enum.FORGET
            });
        }
        await this.node.processor.flushKobjQueue();
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
            (frontmatter) => {
                if (!frontmatter[RID_FIELD])
                    frontmatter[RID_FIELD] = `${OBSIDIAN_NOTE_TYPE}:${this.settings.vaultId}/${randomUUID()}`;

                frontmatter[KOI_NET_ENABLED_FIELD] = true;

                this.fileIndex[file.path] = frontmatter[RID_FIELD];
            }
        );
        await this.handleFile(file);
    }

    async handleFile(file: TFile, emit_notice: boolean = true) {
        // read the file directly rather than through processFrontMatter (which
        // can't await async callbacks) or the metadata cache (which may lag
        // behind a 'modify' event)
        const data = await this.app.vault.read(file);
        const info = getFrontMatterInfo(data);
        const frontmatter = info.exists ? parseYaml(info.frontmatter) : null;

        if (!frontmatter) {
            console.log("didn't find frontmatter");
            return;
        }

        if (frontmatter[KOI_NET_ENABLED_FIELD] === false) {
            console.log("forgetting", frontmatter[RID_FIELD]);
            if (emit_notice)
                new Notice(`KOI-net: Stopped tracking "${file.basename}"`);
            this.node.processor.handle({
                rid: frontmatter[RID_FIELD],
                eventType: EventType.enum.FORGET
            });
        } else {
            // the enabled flag stays in the file but isn't part of the shared note
            delete frontmatter[KOI_NET_ENABLED_FIELD];

            if (!this.node.cache.exists(frontmatter[RID_FIELD]))
            //     new Notice("KOI-net: note modified");
            // else
                if (emit_notice)
                    new Notice(`KOI-net: Started tracking "${file.basename}"`);

            const text = data.slice(info.contentStart);

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
}