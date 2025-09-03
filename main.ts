import { Plugin, TFile, setIcon, Notice, setTooltip, App, Modal, Setting, debounce, getFrontMatterInfo, MetadataCache } from 'obsidian';
import { Mutex } from 'async-mutex';
import { KoiPluginSettings, KoiSettingTab, DEFAULT_SETTINGS } from 'settings';
import { TelescopeFormatter } from 'formatter';
import { defaultTelescopeTemplate } from 'default-template';
import { RequestHandler } from 'koi-net/network/request_handlers';
import { NodeInterface } from 'koi-net/core';
import { KoiCache } from 'rid-lib/ext/cache';
import { PrivateKey } from 'koi-net/protocol/secure';
import { KoiNetConfigSchema } from 'koi-net/config';
import { sha256Hash } from 'rid-lib/ext/utils';
import { EventType } from 'koi-net/protocol/event';
import { randomUUID } from 'crypto';
import { Bundle } from 'rid-lib/ext/bundle';
import { configureNode } from 'node-configuration';
import { SetupModal } from 'setup-modal';
import { Indexer } from 'indexer';



export default class KoiPlugin extends Plugin {
    settings: KoiPluginSettings;
    cache: KoiCache;
    node: NodeInterface;
    config: KoiNetConfigSchema;

    statusBarIconString: string;
    statusBarIcon: HTMLElement;
    statusBarText: HTMLElement;
    connected: boolean;
    syncMutex: Mutex;
    fileFormatter: TelescopeFormatter;
    indexer: Indexer;

    vaultId: string;
    poller: number;

    async onload() {
        console.log("hello world!");

        await this.loadSettings();
        this.addSettingTab(new KoiSettingTab(this.app, this));

        this.settings.vaultId = (this.app as unknown as { appId: string }).appId;
        this.saveSettings();

        // window.plugin = this;

        this.config = this.settings.config;

        this.cache = new KoiCache({
            vault: this.app.vault,
            directoryPath: this.config.cache_directory_path
        });

        this.node = new NodeInterface({
            cache: this.cache,
            config: this.config
        });

        this.fileFormatter = new TelescopeFormatter(this, this.cache, this.node.effector);

        this.indexer = new Indexer(this);

        configureNode(this.node, this);

        console.log("i am", this.node.identity.rid);

        this.syncMutex = new Mutex();
        this.connected = true;

        this.statusBarText = this.addStatusBarItem();
        this.statusBarIcon = this.addStatusBarItem();
        this.statusBarIcon.addClass("koi-status-icon");
        this.statusBarIcon.setAttribute("data-tooltip-position", "top");
        this.statusBarIcon.addEventListener("click", async () => {
            if (!this.settings.initialized) {
                this.createSetupModal();
            }
        });

        // this.addCommand({
        // 	id: 'refresh-with-koi',
        // 	name: 'Refresh with KOI',
        // 	callback: async () => {
        // 		await this.refreshKoi();
        // 	}
        // });

        this.addCommand({
            id: 'drop-rid-cache',
            name: 'Drop RID cache',
            callback: async () => {
                await this.cache.drop();
            }
        });


        this.addCommand({
            id: 'set-node-rid',
            name: 'Set KOI-net node RID',
            callback: () => {

            }
        })

        this.addCommand({
            id: 'reformat-telescopes',
            name: 'Reformat telescopes from template',
            callback: async () => {
                await this.fileFormatter.writeMultiple(
                    this.node.cache.listRids()
                );
            }
        })

        this.addCommand({
            id: 'recompile-templates',
            name: 'Recompile templates',
            callback: async () => {
                await this.fileFormatter.compileTemplates();
            }
        })

        this.addCommand({
            id: 'track-this-note',
            name: 'Track this note',
            callback: async () => {
                const active = this.app.workspace.getActiveFile();
                if (!(active instanceof TFile)) return;
                await this.indexer.trackFile(active);
            }
        })

        this.registerEvent(
            this.app.vault.on('modify', async (file: TFile) => {
                if (file.path.startsWith(this.settings.templatePath)) {
                    console.log("detect change in templates, recompiling...");
                    await this.fileFormatter.compileTemplates();
                    return;
                }

                if (file.parent?.name === this.settings.koiSyncFolderPath)
                    return;

                await this.indexer.modifyNote(file);
            })
        );

        this.registerEvent(
            this.app.vault.on('rename', async (
                file: TFile, oldPath: string
            ) => {
                await this.indexer.renameNote(file, oldPath);
            })
        )

        this.registerEvent(
            this.app.vault.on("delete", async (file: TFile) => {
                await this.indexer.deleteNote(file);
            })
        )

        this.app.workspace.onLayoutReady(() => {
            console.log("calling setup");
            this.setup();
        })
    }

    async setup() {
        if (!this.app.vault.getFolderByPath(this.settings.koiSyncFolderPath)) {
            await this.app.vault.createFolder(this.settings.koiSyncFolderPath);
        }


        // console.log("resolved links:", this.app.metadataCache.resolvedLinks);
        // const templateFile = this.app.vault.getFileByPath(
        //     this.settings.templatePath);
        // if (!templateFile) {
        //     await this.app.vault.create(
        //         this.settings.templatePath,
        //         defaultTelescopeTemplate
        //     );
        //     new Notice("Generated default telescope formatting template");
        // }

        // console.log("ready");
        // this.node.cache.listRids();
        await this.updateStatusBar();
        await this.fileFormatter.compileTemplates();

        if (!this.settings.initialized) return;


        await this.node.secure.loadPrivKey(this.config.priv_key!);
        await this.node.lifecycle.start();

        await this.indexer.indexNotes();

        new Notice("KOI-net: Started polling network...");
        this.poller = this.registerInterval(
            window.setInterval(
                async () => {
                    await this.node.poller.poll();
                    // await this.updateStatusBar();
                    // console.log("resolved links:", this.app.metadataCache.resolvedLinks);
                },
                this.config.polling_interval * 1000
            )
        );

    }

    createSetupModal() {
        new SetupModal(
            this.app,
            async (
                { nodeName, firstContactRid, firstContactUrl }: {
                    nodeName: string,
                    firstContactRid: string,
                    firstContactUrl: string
                }
            ) => {
                const privKey = await PrivateKey.generate();
                const pubKey = await privKey.publicKey();
                const pubKeyDer = await pubKey.toDer();
                const pubKeyHash = sha256Hash(pubKeyDer);

                const nodeRid = `orn:koi-net.node:${nodeName}+${pubKeyHash}`;

                this.settings.config.node_rid = nodeRid;
                this.settings.config.priv_key = await privKey.toJwk();
                this.settings.config.node_profile.public_key = pubKeyDer;
                this.settings.config.first_contact.rid = firstContactRid;
                this.settings.config.first_contact.url = firstContactUrl;
                this.settings.initialized = true;
                await this.saveSettings();

                new Notice(`KOI-net: Node RID set to ${nodeRid}`);

                await this.setup();
            }
        ).open();
    }

    async updateStatusBar() {
        const prevIconString = this.statusBarIconString;

        if (!this.settings.initialized) {
            this.statusBarIconString = "circle-play";
            setTooltip(this.statusBarIcon, "Click to setup your KOI-net node!");
        } else {
            this.statusBarIconString = "circle-check";
            setTooltip(this.statusBarIcon, "Synced!");
        }

        if (this.statusBarIconString !== prevIconString) {
            setIcon(this.statusBarIcon, this.statusBarIconString);
        }

        this.statusBarText.setText(`KOI-net: ${this.cache.listRids().length} 📜`);
    }

    

    async loadSettings() {
        const loadedSettings = await this.loadData();
        this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedSettings);
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}