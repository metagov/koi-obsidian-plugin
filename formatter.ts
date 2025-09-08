import KoiPlugin from "main";
import { App, normalizePath, stringifyYaml, TAbstractFile, TFile, TFolder, Vault } from "obsidian";
import type { KoiPluginSettings } from "settings";
import * as Handlebars from 'handlebars';
import { Notice } from "obsidian";
import { KoiCache } from "rid-lib/ext/cache";
import { Effector } from "koi-net/effector";
import { parseRidString } from "rid-lib/utils";
import { ObsidianNote } from "models";
import { OBSIDIAN_NOTE_TYPE, RID_FIELD, SHA256_HASH_FIELD, SLACK_USER_TYPE, TELESCOPED_TYPE, TIMESTAMP_FIELD } from "consts";
import { TelescopeContentsSchema } from "telescope-types";
import { toFilenameSafeDateWithMs } from "utils";
import { DEFAULT_TABLE } from "default-templates";


export class TelescopeFormatter {
    plugin: KoiPlugin;
    app: App;
    settings: KoiPluginSettings;
    cache: KoiCache;
    effector: Effector;
    handleBarTemplates: Record<string, Handlebars.TemplateDelegate>;

    constructor(plugin: KoiPlugin, cache: KoiCache, effector: Effector) {
        this.plugin = plugin;
        this.app = plugin.app;
        this.settings = plugin.settings;
        this.cache = cache;
        this.effector = effector;

        this.handleBarTemplates = {};

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
            console.log(this);
            return text.replace(
                /<@([A-Z0-9]+)>/g,
                (match, userId) => path.replace(/\$userId/g, userId).replace(/\$userName/g, this.userNameLookup[userId] || userId)
            )
        });
        Handlebars.registerHelper("linkTo", (rid: string, showRid: boolean = true) => {
            const file = this.getFileByRid(rid);
            if (!file) {
                console.log(`couldn't find ${rid}`);
                return rid;
            }
            if (showRid)
                return `${file.path}|${rid}`;
            else
                return file.path;
        });
    }

    async compileTemplates(): Promise<void> {
        let folder;
        folder = this.app.vault.getFolderByPath(
            this.settings.templatePath
        );

        if (!folder) {
            console.log("template folder doesn't exist");
            folder = await this.app.vault.createFolder(this.settings.templatePath);

            for (const [fileName, template] of Object.entries(DEFAULT_TABLE)) {
                await this.app.vault.create(
                    `${this.settings.templatePath}/${fileName}.md`,
                    template
                );
            }
        };

        const files: Array<TFile> = [];
        Vault.recurseChildren(
            folder, (file: TAbstractFile) => {
                if (file instanceof TFile)
                    files.push(file);
            }
        )

        for (const file of files) {
            const namespace = file.basename;
            const ridType = `orn:${namespace}`;

            console.log(`found template for ${ridType}`);
            
            const templateString = await this.app.vault.read(file);

            const formattedTemplateString = templateString.replace(/^```\n?([\s\S]*?)```\n?/, '$1');

            this.handleBarTemplates[ridType] = Handlebars.compile(formattedTemplateString);
        }
    }

    async getFolderByPath(path: string) {
        return (
            this.app.vault.getFolderByPath(path) ||
            await this.app.vault.createFolder(path)
        );
    }

    getFileByRid(rid: string): TFile | undefined {
        const folder = this.app.vault.getFolderByPath(this.settings.koiSyncFolderPath);
        if (!folder) return;

        for (const subFolder of folder.children) {
            if (!(subFolder instanceof TFolder)) 
                continue;

            for (const file of subFolder.children) {
                if (!(file instanceof TFile)) 
                    continue;

                const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
                if (rid === frontmatter?.[RID_FIELD])
                    return file;
            }
        }
        return undefined;
    }

    safeFileName(name: string): string {
        return name.replace(/[^a-zA-Z0-9-_.+ ]/g, '_')
    }

    async writeMultiple(rids: Array<string>) {
        const notice = new Notice("", 0);
        let count = 0;
        for (const rid of rids) {
            await this.write(rid);
            count++;
            if (notice) notice.setMessage(`Formatting bundles... (${count}/${rids.length})`);
        }
        if (notice) notice.setMessage(`Done formatting! (${count}/${rids.length})`);

        setTimeout(() => {
            notice.hide();
        }, 3000);
    }

    async write(rid: string) {
        const bundle = await this.cache.read(rid);
        if (!bundle) return;

        const data = Object.assign({}, bundle.contents)
        // data.obsidian_filename = this.getFileName(rid);
        // data.obsidian_filepath = this.getFilePath(rid);

        const {ridType, reference} = parseRidString(rid);
        let title = this.safeFileName(reference!);

        if (ridType === TELESCOPED_TYPE) {
            const telescopeData = TelescopeContentsSchema.parse(bundle.contents);
            const rawText = telescopeData.text;

            const captureUserId = /<@([A-Z0-9]+)>/g;
            const userNameLookup: Record<string, string | unknown> = {};
            const userIds = [...rawText.matchAll(captureUserId)].map(m => m[1]);
            for (const userId of userIds) {
                const userRid = `${SLACK_USER_TYPE}:${telescopeData.team_id}/${userId}`
                const bundle = await this.effector.deref({ rid: userRid });
                userNameLookup[userId] = bundle?.contents.real_name;
            }
            data.userNameLookup = userNameLookup;
            console.log(telescopeData);
            const authorName = telescopeData.author_is_anonymous ? "anonymous" : telescopeData.author_name;
            const timestamp = toFilenameSafeDateWithMs(telescopeData.timestamp);
            
            title = `@${authorName} (${telescopeData.channel_name}) ${timestamp}`;
            console.log(title);
        } else if (ridType === OBSIDIAN_NOTE_TYPE) {
            const obsidianNote = bundle.validateContents(ObsidianNote);
            const parts = reference?.split('/');
            const uuid = parts && parts[1];
            title = `${obsidianNote.basename} (${uuid})`;
        }

        let formattedOutput: string;
        if (ridType in this.handleBarTemplates) {        
            formattedOutput = this.handleBarTemplates[ridType](data);
        } else {
            formattedOutput = JSON.stringify(data);
        }

        const subFolder = await this.getFolderByPath(
            `${this.settings.koiSyncFolderPath}/${this.safeFileName(ridType)}`
        );

        const fileName = `${title}.md`;

        const file = (
            this.getFileByRid(rid) || 
            await this.app.vault.create(
                `${subFolder.path}/${fileName}`, ''
            )
        );

        if (file.basename !== title) {
            const parentFolder = file.parent?.path || '';
            const newPath = parentFolder ? `${parentFolder}/${fileName}` : fileName;
            await this.app.fileManager.renameFile(file, newPath);
        }

        await this.app.vault.process(file, () => formattedOutput);
        const metadata = this.app.metadataCache.getFileCache(file);
        // console.log(`${rid} metadata:`);
        // console.log(metadata);

        this.setFrontmatter(file, {
            [RID_FIELD]: bundle.manifest.rid,
            [TIMESTAMP_FIELD]: bundle.manifest.timestamp,
            [SHA256_HASH_FIELD]: bundle.manifest.sha256_hash
        });
    }

    setFrontmatter(file: TFile, newProps: Record<string, any>) {
        this.app.fileManager.processFrontMatter(
            file,
            async (frontmatter) => {
                const oldProps = {...frontmatter};
                for (const key in frontmatter) {
                    delete frontmatter[key];
                }

                for (const key in newProps) {
                    frontmatter[key] = newProps[key];
                }

                for (const key in oldProps) {
                    frontmatter[key] = oldProps[key];
                }
            }
        )   
    }

    async delete(rid: string) {
        const file = await this.getFileByRid(rid);
        if (file) await this.app.vault.delete(file);
    }
}