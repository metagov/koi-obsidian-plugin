import { Plugin, TFile, setIcon, Notice, setTooltip } from 'obsidian';
import { Mutex } from 'async-mutex';
import { KoiPluginSettings, KoiSettingTab, DEFAULT_SETTINGS } from 'settings';
import { TelescopeFormatter } from 'formatter';
import { KoiInterface } from 'koi-interface';
import { RidCache } from 'rid-cache';
import { defaultTelescopeTemplate } from 'default-template';
import { Effector } from 'effector';
import { EventsPayload } from 'koi-net-api-models';


export default class KoiPlugin extends Plugin {
	settings: KoiPluginSettings;
	statusBarIconString: string;
	statusBarIcon: HTMLElement;
	statusBarText: HTMLElement;
	connected: boolean;
	syncMutex: Mutex;
	fileFormatter: TelescopeFormatter;
	koiInterface: KoiInterface;
	ridCache: RidCache;
	effector: Effector;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new KoiSettingTab(this.app, this));

		this.ridCache = new RidCache(this);
		this.koiInterface = new KoiInterface(this);
		this.effector = new Effector(this.koiInterface, this.ridCache);
		this.fileFormatter = new TelescopeFormatter(this, this.ridCache, this.effector);
		
		this.syncMutex = new Mutex();
		this.connected = true;

		this.statusBarText = this.addStatusBarItem();
		this.statusBarIcon = this.addStatusBarItem();
		this.statusBarIcon.addClass("koi-status-icon");
		this.statusBarIcon.setAttribute("data-tooltip-position", "top");
		this.statusBarIcon.addEventListener("click", async () => {
			await this.handleIconClick();
		});


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

		this.addCommand({
			id: 'reformat-telescopes',
			name: 'Reformat telescopes from template',
			callback: async () => {
				await this.fileFormatter.writeMultiple(
					this.ridCache.listRids()
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
		const templateFile = this.app.vault.getFileByPath(this.settings.templatePath);
		if (!templateFile) {
			await this.app.vault.create(
				this.settings.templatePath,
				defaultTelescopeTemplate
			);
			new Notice("Generated default telescope formatting template");
		}

		// console.log("ready");
		this.ridCache.listRids();
		await this.updateStatusBar();
		await this.fileFormatter.compileTemplate();

		// console.log('setup');

		this.syncKoi();
		this.registerInterval(
			window.setInterval(() => this.syncKoi(), 5 * 1000)
		);
	}

	async updateStatusBar() {
		let syncing = this.syncMutex.isLocked();
		const prevIconString = this.statusBarIconString;
		
		if (!this.settings.initialized) {
			this.statusBarIconString = "circle-play";
			setTooltip(this.statusBarIcon, "Click to initialize KOI link!");
		} else if (!this.connected) {
			this.statusBarIconString = "refresh-cw-off";
			setTooltip(this.statusBarIcon, "Can't reach server");
		} else if (syncing) {
			this.statusBarIconString = "refresh-cw";
			setTooltip(this.statusBarIcon, "Syncing...");
		} else {
			this.statusBarIconString = "circle-check";
			setTooltip(this.statusBarIcon, "Synced!");
		}


		if (this.statusBarIconString != prevIconString)
			setIcon(this.statusBarIcon, this.statusBarIconString);

		const numItems = this.ridCache.telescopeCount;
		this.statusBarText.setText(`${numItems} 🔭`);
	}

    validateSettings(): boolean {
        return (
            this.settings.koiApiUrl !== "" &&
            this.settings.koiApiKey !== ""
        );
    }

	async handleIconClick() {
		if (!this.validateSettings())
			new Notice("Please set an API key in the KOI plugin settings");

		if (!this.settings.initialized) {
			await this.koiInterface.subscribeToEvents();
			this.settings.initialized = true;
			await this.saveSettings();
		}

		this.ridCache.listRids();
		await this.refreshKoi();
	}

	async syncKoi() {
		if (!this.settings.initialized) return;
		if (this.syncMutex.isLocked()) return;

		if (!this.validateSettings()) {
			this.updateStatusBar();
			return;
		}
		// console.log("syncing");

		let resp: EventsPayload;
		try {
			resp = await this.koiInterface.pollEvents({
				"rid": "",
				"limit": 50
			});
		} catch (err) {
			if (err.status !== 404) throw err;

			// TODO: edge proposal
			await this.koiInterface.broadcastEvents({
				"events": [
					{
						"rid": "",
						"event_type": "NEW",
						"manifest": {

						},
						"contents": {}
					}
				]
			});
			await this.refreshKoi();
			return;
		} finally {
			this.updateStatusBar();
		}

		if (resp.events.length === 0) return;

		// console.log("attempting sync");
		const release = await this.syncMutex.acquire();
		this.updateStatusBar();

		try {
			// console.log("acquired sync mutex");
			// console.log(`processing ${events.length} events`)

			for (const event of events) {
				// console.log(`${event.event_type}: ${event.rid}`);

				if (event.event_type == 'NEW' || event.event_type == 'UPDATE') {
					const bundle = await this.koiInterface.getObject(event.rid);
					if (bundle) {
						await this.ridCache.write(event.rid, bundle);
						if (event.rid.startsWith("orn:telescope"))
							await this.fileFormatter.write(event.rid);
						this.updateStatusBar();
					}
					
				} else if (event.event_type == 'FORGET') {
					await this.ridCache.delete(event.rid);
					if (event.rid.startsWith("orn:telescope"))
						await this.fileFormatter.delete(event.rid);
					this.updateStatusBar();
				}
			}
		} finally {
			release();
			this.updateStatusBar();
			// console.log("released sync mutex");
		}
	}

	async refreshKoi() {
		// console.log("attempting refresh");
		const release = await this.syncMutex.acquire();
		this.updateStatusBar();

		const updatedRids: Array<string> = [];

		try {
			// console.log("acquired sync mutex");

			const remoteManifests = await this.koiInterface.getManifests();
			if (!remoteManifests) return;
			
			const remoteRids: Array<string> = [];

			// console.log(`fetched ${remoteManifests.length} rids`);

			const promises = [];

			for (const manifest of remoteManifests) {
				if (!manifest.rid.startsWith("orn:telescoped")) continue;
				remoteRids.push(manifest.rid);

				const bundle = await this.ridCache.read(manifest.rid);
				if (!bundle || JSON.stringify(bundle.manifest) !== JSON.stringify(manifest)) {
					updatedRids.push(manifest.rid);

					const promise = this.koiInterface.getObject(manifest.rid)
						.then(async (remoteBundle) => {
							if (!remoteBundle) {
								console.log("didn't receive remote bundle");
								return;
							};
							// console.log("writing", manifest.rid);

							await this.ridCache.write(manifest.rid, remoteBundle);
							// await this.fileFormatter.write(manifest.rid);
							await this.updateStatusBar();
						})
						.catch((reason) => {
							// console.log(reason);
						});

					promises.push(promise);
				}
			}
			
			await Promise.all(promises);

			for (const localRid of this.ridCache.listRids()) {
				if (!remoteRids.includes(localRid) && localRid.startsWith("orn:telescoped")) {
					console.log("deleting", localRid);
					await this.ridCache.delete(localRid);
					// await this.fileFormatter.delete(localRid);
					this.updateStatusBar();
				}
			}
		} finally {
			// console.log("released sync mutex");
			release();
			this.updateStatusBar();
		}
		if (updatedRids.length > 0)
			await this.fileFormatter.writeMultiple(updatedRids);
	}

	async loadSettings() {
		const loadedSettings = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedSettings);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}