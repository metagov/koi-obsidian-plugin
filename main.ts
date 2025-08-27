import { Plugin, TFile, setIcon, Notice, setTooltip, App, Modal, Setting, debounce, getFrontMatterInfo } from 'obsidian';
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
import { EventType, KoiEvent } from 'koi-net/protocol/event';
import { randomUUID, UUID } from 'crypto';
import { Bundle } from 'rid-lib/ext/bundle';
import { HandlerType, KnowledgeHandler } from 'koi-net/processor/handler';
import { HandlerContext } from 'koi-net/context';
import { KnowledgeObject, STOP_CHAIN } from 'koi-net/processor/knowledge_object';
import { NodeProfileSchema, NodeType } from 'koi-net/protocol/node';
import { generateEdgeBundle } from 'koi-net/protocol/edge';
import { parseRidString } from 'rid-lib/utils';


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

    vaultId: string;
    poller: number;

    async onload() {
        console.log("hello world!");

        await this.loadSettings();
        this.addSettingTab(new KoiSettingTab(this.app, this));
        
        this.vaultId = this.app.appId;

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

        this.fileFormatter = new TelescopeFormatter(this, this.cache, this.node.effector);
        
        this.syncMutex = new Mutex();
        this.connected = true;

        this.statusBarText = this.addStatusBarItem();
        this.statusBarIcon = this.addStatusBarItem();
        this.statusBarIcon.addClass("koi-status-icon");
        this.statusBarIcon.setAttribute("data-tooltip-position", "top");
        
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
                const activeFile = this.app.workspace.getActiveFile();
                if (!(activeFile instanceof TFile)) return;
                await this.trackFile(activeFile);
            }
        })

        console.log("Registered");

        this.registerEvent(
            this.app.vault.on('modify', async (file: TFile) => {

                if (file.parent?.name === this.settings.koiSyncFolderPath) return;

                console.log(file.name);
                await this.handleFile(file);

                // if (file.name !== this.settings.templatePath) return;
                // console.log("compiling templates");
                // await this.fileFormatter.compileTemplates();
            })
        );

        const specialObsidianRidHandler = new KnowledgeHandler({
            handlerType: HandlerType.RID,
            ridTypes: ["orn:obsidian.note"],
            func: (ctx: HandlerContext, kobj: KnowledgeObject) => {
                const {reference} = parseRidString(kobj.rid);
                if (reference?.startsWith(this.vaultId)) {
                    console.log("EVENT BOUNCING BACK FROM MANAGER");
                    return STOP_CHAIN;
                }
            }
        })

        const formatterSyncHandler = new KnowledgeHandler({
            handlerType: HandlerType.Network,
            func: async (ctx: HandlerContext, kobj: KnowledgeObject) => {
                console.log("NORMALIZED EVENT TYPE", kobj.normalizedEventType);
                if (kobj.normalizedEventType === "FORGET") {
                    await this.fileFormatter.delete(kobj.rid);
                } else {
                    await this.fileFormatter.write(kobj.rid);
                }
            }
        })
        const managerContactHandler = new KnowledgeHandler({
            handlerType: HandlerType.Network,
            ridTypes: ["orn:koi-net.node"],
            func: async (ctx: HandlerContext, kobj: KnowledgeObject) => {
                const nodeProfile = kobj.bundle!.validateContents(NodeProfileSchema);
                console.log("found obsidian manager!", kobj.rid);
                
                if (!nodeProfile.provides.event?.contains("orn:obsidian.note"))
                    return;
        
                if (kobj.rid === ctx.identity.rid)
                    return;

                if (nodeProfile.node_type !== NodeType.enum.FULL)
                    return;

                ctx.processor.handle({
                    bundle: generateEdgeBundle({
                        source: kobj.rid,
                        target: ctx.identity.rid,
                        edgeType: "POLL",
                        ridTypes: ["orn:obsidian.note"]
                    })
                });

                const payload = await ctx.requestHandler.fetchRids({
                    node: kobj.rid,
                    req: {rid_types: ["orn:obsidian.note"]}
                });
                for (const rid of payload.rids) {
                    if (rid === ctx.identity.rid) continue;
                    if (ctx.cache.exists(rid)) continue;
                    ctx.processor.handle({rid, source: kobj.rid});
                }
            }
        })

        this.node.pipeline.addHandler(formatterSyncHandler);
        this.node.pipeline.addHandler(managerContactHandler);
        this.node.pipeline.addHandler(specialObsidianRidHandler);

        this.app.workspace.onLayoutReady(() => {
            console.log("calling setup");
            this.setup();
        })
    }

    async setup() {
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
        this.node.cache.listRids();
        await this.fileFormatter.compileTemplates();

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

    async trackFile(file: TFile) {
        await this.app.fileManager.processFrontMatter(
            file,
            async (frontmatter) => {
                let rid: string;

                if (!frontmatter.rid)
                    frontmatter.rid = `orn:obsidian.note:${this.vaultId}/${randomUUID()}`;

                frontmatter.koi_net_enabled = true;

                await this.handleFile(file);
            }
        );
    }

    async handleFile(file: TFile) {
        await this.app.fileManager.processFrontMatter(
            file,
            async (frontmatter) => {
                if (!frontmatter.rid) 
                    return;

                console.log("frontmatter!", frontmatter);

                if (!frontmatter.koi_net_enabled) {
                    console.log("forgetting", frontmatter.rid);
                    this.node.processor.handle({
                        rid: frontmatter.rid,
                        eventType: EventType.enum.FORGET
                    });
                } else {
                    const data = await this.app.vault.read(file);
                    delete frontmatter.koi_net_enabled;

                    const text = data.replace(/^---[\s\S]*?---/, '');

                    this.node.processor.handle({
                        bundle: Bundle.generate({
                            rid: frontmatter.rid, 
                            contents: { text, frontmatter }
                        })
                    });
                }
                await this.node.processor.flushKobjQueue();
            }
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