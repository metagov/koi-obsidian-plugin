import { Plugin, TFile, setIcon, Notice, setTooltip, App, Modal, Setting } from 'obsidian';
import { Mutex } from 'async-mutex';
import { KoiPluginSettings, KoiSettingTab, DEFAULT_SETTINGS } from 'settings';
import { TelescopeFormatter } from 'formatter';
import { RidCache } from 'rid-cache';
import { defaultTelescopeTemplate } from 'default-template';
import { Effector } from 'effector';
import { RequestHandler } from 'koi-net/network/request_handlers';
import { createNodeRid } from 'koi-net/protocol/node';
import { NodeInterface } from 'koi-net/core';
import { KoiCache } from 'rid-lib/ext/cache';
import { DirectedGraph } from 'graphology';


export default class KoiPlugin extends Plugin {
	settings: KoiPluginSettings;
	cache: KoiCache;
	node: NodeInterface;

	statusBarIconString: string;
	statusBarIcon: HTMLElement;
	statusBarText: HTMLElement;
	connected: boolean;
	syncMutex: Mutex;
	fileFormatter: TelescopeFormatter;
	effector: Effector;
	reqHandler: RequestHandler;

	async onload() {
		console.log("hello world!");

		await this.loadSettings();
		this.addSettingTab(new KoiSettingTab(this.app, this));
		
		this.cache = new KoiCache(this.app.vault, ".ridcache");

		console.log(this.settings);

		this.node = new NodeInterface({
			cache: this.cache,
			plugin: this
		});

		this.fileFormatter = new TelescopeFormatter(this, this.cache, this.effector);
		
		this.syncMutex = new Mutex();
		this.connected = true;

		this.statusBarText = this.addStatusBarItem();
		this.statusBarIcon = this.addStatusBarItem();
		this.statusBarIcon.addClass("koi-status-icon");
		this.statusBarIcon.setAttribute("data-tooltip-position", "top");
		
		window.plugin = this;

		// this.addCommand({
		// 	id: 'refresh-with-koi',
		// 	name: 'Refresh with KOI',
		// 	callback: async () => {
		// 		await this.refreshKoi();
		// 	}
		// });

		// this.addCommand({
		// 	id: 'drop-rid-cache',
		// 	name: 'Drop RID cache',
		// 	callback: async () => {
		// 		await this.ridCache.drop();
		// 	}
		// });

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
			callback: async () => {
				new ExampleModal(this.app, (name) => {
					let nodeRid = createNodeRid(name);
					this.settings.nodeRid = nodeRid;
					new Notice(`Node RID set to \`${nodeRid}\``);
				}).open();
			}
		})

		this.addCommand({
			id: 'reformat-telescopes',
			name: 'Reformat telescopes from template',
			callback: async () => {
				await this.fileFormatter.writeMultiple(
					this.cache.listRids()
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
		this.cache.listRids();
		await this.fileFormatter.compileTemplate();
	}

	
	async loadSettings() {
		const loadedSettings = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedSettings);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}