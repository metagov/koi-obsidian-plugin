import KoiPlugin from "main";
import { App, normalizePath, stringifyYaml, TAbstractFile, TFile, Vault } from "obsidian";
import type { KoiPluginSettings } from "settings";
import * as Handlebars from 'handlebars';
import { Notice } from "obsidian";
import { KoiCache } from "rid-lib/ext/cache";
import { Effector } from "koi-net/effector";
import { parseRidString } from "rid-lib/utils";


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
            return text.replace(
                /<@([A-Z0-9]+)>/g,
                (match, userId) => path.replace(/\$userId/g, userId).replace(/\$userName/g, this.userNameLookup[userId] || userId)
            )
        })
    }

    async compileTemplates(): Promise<void> {
        let folder;
        folder = this.app.vault.getFolderByPath(
            this.settings.templatePath
        );

        if (!folder) {
            console.log("template folder doesn't exist");
            folder = await this.app.vault.createFolder(this.settings.templatePath);
            await this.app.vault.create(
                `${this.settings.templatePath}/koi-net.node.md`,
                `\`\`\`
---
rid: {{rid}}
timestamp: {{timestamp}}
sha256_hash: {{sha256_hash}}
base_url: {{base_url}}
node_type: {{node_type}}
provides_event: {{provides.event}}
provides_state: {{provides.state}}
public_key: {{public_key}}
---
\`\`\``
            );
            await this.app.vault.create(
                `${this.settings.templatePath}/koi-net.edge.md`,
                `\`\`\`
---
{{{yaml this}}}
---
\`\`\``
            );
            await this.app.vault.create(
                `${this.settings.templatePath}/obsidian.note.md`,
                `\`\`\`
---
{{{yaml frontmatter}}}
path: {{path}}
aliases:
- {{basename}} ~linked
---
\`\`\`
# {{basename}}
{{{text}}}`
            );
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

    getFileName(rid: string): string {
        return btoa(rid) + ".md";
    };

    getFilePath(rid: string): string {
        return this.settings.koiSyncFolderPath + "/" + this.getFileName(rid);
    }

    getFileObject(rid: string): TFile | null {
        return this.app.vault.getFileByPath(
            this.getFilePath(rid)
        );
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

        const data = Object.assign({
            "rid": bundle.manifest.rid,
            "timestamp": bundle.manifest.timestamp,
            "sha256_hash": bundle.manifest.sha256_hash
        }, bundle.contents)
        data.obsidian_filename = this.getFileName(rid);
        data.obsidian_filepath = this.getFilePath(rid);

        const {ridType} = parseRidString(rid);

        if (ridType === 'orn:telescopeod') {
            const rawText = <string>bundle.contents.text;

            const captureUserId = /<@([A-Z0-9]+)>/g;
            const userNameLookup: Record<string, string | unknown> = {};
            const userIds = [...rawText.matchAll(captureUserId)].map(m => m[1]);
            for (const userId of userIds) {
                const userRid = `orn:slack.user:${data.team_id}/${userId}`
                const bundle = await this.effector.deref({ rid: userRid });
                userNameLookup[userId] = bundle?.contents.real_name;
            }
            data.userNameLookup = userNameLookup;
        } else if (ridType === 'orn:obsidian.note') {

        }


        let formattedOutput: string;
        if (ridType in this.handleBarTemplates) {        
            formattedOutput = this.handleBarTemplates[ridType](data);
        } else {
            formattedOutput = JSON.stringify(data);
        }

        const file = this.getFileObject(rid);
        if (file) {
            // console.log("modified file");
            await this.app.vault.process(file, () => formattedOutput)
            const metadata = this.app.metadataCache.getFileCache(file);
            console.log(`${rid} metadata:`);
            console.log(metadata);
        } else {
            // console.log("created new file");
            await this.app.vault.create(this.getFilePath(rid), formattedOutput)
        }
    }

    async delete(rid: string) {
        const file = this.getFileObject(rid);
        if (file) await this.app.vault.delete(file);
    }

}