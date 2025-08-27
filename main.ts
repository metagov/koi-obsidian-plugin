import { Plugin, TFile, setIcon, Notice, setTooltip, App, Modal, Setting } from 'obsidian';
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
import { EventsPayload } from 'koi-net/protocol/api_models';
import { KoiEvent } from 'koi-net/protocol/event';
import { randomUUID, UUID } from 'crypto';
import { Bundle } from 'rid-lib/ext/bundle';


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
    reqHandler: RequestHandler;

    poller: number;

    async onload() {
        console.log("hello world!");

        await this.loadSettings();
        this.addSettingTab(new KoiSettingTab(this.app, this));

        console.log(this.app.appId);
        window.plugin = this;

        this.config = this.settings.config;

        this.cache = new KoiCache({
            vault: this.app.vault, 
            directoryPath: this.config.cache_directory_path
        });
        
        this.node = new NodeInterface({
            cache: this.cache,
            config: this.config
        });

        // const event1 = KoiEvent.validate(
        //     {
        //         "rid": "orn:koi-net.node:luke+5930c20bac97e52ddd10890b5ee316ce4c82308f7e381b9ebad145cc2e0e3008",
        //         "event_type": "FORGET"
        //     }
        // );
        // console.log(event1);

        // return;
        // const event2 = KoiEvent.validate(
        //     {
        //         "rid": "orn:koi-net.node:luke+5930c20bac97e52ddd10890b5ee316ce4c82308f7e381b9ebad145cc2e0e3008",
        //         "event_type": "NEW",
        //         "manifest": {
        //             "rid": "orn:koi-net.node:luke+5930c20bac97e52ddd10890b5ee316ce4c82308f7e381b9ebad145cc2e0e3008",
        //             "timestamp": "2025-08-22T20:59:40.323Z",
        //             "sha256_hash": "11e6d64cd8f2b2148a9cf0780d6a8b0354bf083bfbd23a169408c14c12568cfb"
        //         },
        //         "contents": {
        //             "node_type": "PARTIAL",
        //             "provides": {
        //                 "event": [
        //                     "orn:obsidian.note"
        //                 ],
        //                 "state": []
        //             },
        //             "public_key": "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEsCYFdIeB0lmH5TvXPtPotwRvYVF5BzkZN5P0gx2vdL4xANey5PA7MFRgZRO0a4ZwUzoPdIbiCLhf/v/LwZRBfg=="
        //         }
        //     }
        // );
        // console.log(event2);

        // EventsPayload.parse({
        //     events: [
        //         event1, event2
        //     ]
        // })
        // return;

        this.fileFormatter = new TelescopeFormatter(this, this.cache, this.node.effector);
        
        this.syncMutex = new Mutex();
        this.connected = true;

        this.statusBarText = this.addStatusBarItem();
        this.statusBarIcon = this.addStatusBarItem();
        this.statusBarIcon.addClass("koi-status-icon");
        this.statusBarIcon.setAttribute("data-tooltip-position", "top");
        
        // window.plugin = this;
        // window.node = this.node;

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

        class ExampleModal extends Modal {
            constructor(app: App, onSubmit: (result: string) => void) {
                super(app);
                this.setContent("Set up your KOI node!");
                let nodeName = "";
            
                new Setting(this.contentEl)
                    .setName('Node name:')
                    .addText((text) =>
                        text.onChange((value) => {
                            nodeName = value;
                        }));
                
                new Setting(this.contentEl)
                    .addButton((btn) =>
                        btn
                            .setButtonText("Submit")
                            .setCta()
                            .onClick(() => {
                                this.close();
                                onSubmit(nodeName);
                            }));
            }
        }

        this.addCommand({
            id: 'set-node-rid',
            name: 'Set KOI-net node RID',
            callback: () => {
                new ExampleModal(this.app, async (name) => {
                    const privKey = await PrivateKey.generate();
                    const pubKey = await privKey.publicKey();
                    const pubKeyDer = await pubKey.toDer();
                    const pubKeyHash = sha256Hash(pubKeyDer);

                    const nodeRid = `orn:koi-net.node:${name}+${pubKeyHash}`;

                    this.settings.config.node_rid = nodeRid;
                    this.settings.config.priv_key = await privKey.toJwk();
                    this.settings.config.node_profile.public_key = pubKeyDer;
                    this.settings.initialized = true;
                    await this.saveSettings();

                    new Notice(`Node RID set to \`${nodeRid}\``);

                    // await this.setup();
                }).open();
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
            id: 'track-this-note',
            name: 'Track this note',
            callback: async () => {
                const activeFile = this.app.workspace.getActiveFile();

                if (!(activeFile instanceof TFile)) return;


                await this.app.fileManager.processFrontMatter(
                    activeFile,
                    async (frontmatter) => {
                        let rid: string;

                        if (!frontmatter.rid) {
                            rid = `orn:obsidian.note:${this.app.appId}/${randomUUID()}`;
                            frontmatter.rid = rid;
                        } else {
                            rid = frontmatter.rid;
                        }

                        const data = await this.app.vault.read(activeFile);
                        this.node.processor.handle({
                            bundle: Bundle.generate({
                                rid, 
                                contents: {
                                    text: data
                                }
                            })
                        });

                        await this.node.processor.flushKobjQueue();
                    }
                );
            }
        })

        this.registerEvent(
            this.app.vault.on('modify', async (file: TFile) => {
                if (file.name !== this.settings.templatePath) return;
                await this.fileFormatter.compileTemplate();
            })
        );

        this.app.workspace.onLayoutReady(() => {
            this.setup();
        })
    }

    async setup() {
        const templateFile = this.app.vault.getFileByPath(
            this.settings.templatePath);
        if (!templateFile) {
            await this.app.vault.create(
                this.settings.templatePath,
                defaultTelescopeTemplate
            );
            new Notice("Generated default telescope formatting template");
        }

        // console.log("ready");
        this.node.cache.listRids();
        await this.fileFormatter.compileTemplate();

        if (!this.settings.initialized) return;
        await this.node.secure.loadPrivKey(this.config.priv_key!);
        console.log((await this.node.secure.privKey.publicKey()).toDer());
        await this.node.lifecycle.start();

        this.poller = this.registerInterval(
            window.setInterval(
                async () => {
                    await this.node.poller.poll();
                }, 
                this.config.polling_interval * 1000
            )
        );

    }
    
    async loadSettings() {
        const loadedSettings = await this.loadData();
        this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedSettings);
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}