import { Plugin, TFile, setIcon, Notice } from 'obsidian';
import { Mutex } from 'async-mutex';
import { KoiPluginSettings, KoiSettingTab, DEFAULT_SETTINGS } from 'settings';
import { TelescopeFormatter } from 'formatter';
import { KoiInterface } from 'koi-interface';
import { RidCache } from 'rid-cache';


export default class KoiPlugin extends Plugin {
	settings: KoiPluginSettings;
	// statusBar: HTMLElement;
	statusBarIconString: string;
	statusBarIcon: HTMLElement;
	statusBarText: HTMLElement;
	connected: boolean;
	syncMutex: Mutex;
	fileFormatter: TelescopeFormatter;
	koiInterface: KoiInterface;
	ridCache: RidCache;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new KoiSettingTab(this.app, this));

		this.ridCache = new RidCache(this);
		this.koiInterface = new KoiInterface(this);
		this.fileFormatter = new TelescopeFormatter(this, this.ridCache);
		
		this.syncMutex = new Mutex();
		this.connected = true;

		this.statusBarText = this.addStatusBarItem();
		this.statusBarIcon = this.addStatusBarItem();
		this.statusBarIcon.addClass("koi-status-icon");
		this.statusBarIcon.setAttribute("data-tooltip-position", "top");
		this.statusBarIcon.addEventListener("click", async () => {
			await this.handleIconClick();
		});

		window.p = this;

		this.addCommand({
			id: 'refresh-with-koi',
			name: 'Refresh with KOI',
			callback: async () => {
				await this.refreshKoi();
			}
		});

		this.addCommand({
			id: 'drop-rid-cache',
			name: 'Drop RID cache',
			callback: async () => {
				await this.ridCache.drop();
			}
		});

		this.addCommand({
			id: 'reformat-telescopes',
			name: 'reformat-telescopes',
			callback: async () => {
				await this.fileFormatter.rewriteAll();
			}
		})


		this.addRibbonIcon(
			"refresh-cw",
			"Manually sync with Telescope KOI",
			() => {
				this.refreshKoi();
			}
		)

	

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

	onunload() {

	}

	async setup() {
		console.log("ready");
		await this.ridCache.readAllRids();
		await this.updateStatusBar();
		await this.fileFormatter.compileTemplate();

		if (this.settings.koiApiSubscriberId === "") {
			console.log("missing subcriber id");
            await this.koiInterface.subscribeToEvents();
			await this.refreshKoi();
		}

		console.log('setup');

		this.syncKoi();
		this.registerInterval(
			window.setInterval(() => this.syncKoi(), 5 * 1000)
		);
	}

	async updateStatusBar() {
		let syncing = this.syncMutex.isLocked();

		const prevIconString = this.statusBarIconString;
		
		if (this.settings.paused) {
			this.statusBarIconString = "circle-pause";
			this.statusBarIcon.ariaLabel = "Syncing paused";
		} else if (!this.connected) {
			this.statusBarIconString = "refresh-cw-off";
			this.statusBarIcon.ariaLabel = "Can't reach server";
		} else if (syncing) {
			this.statusBarIconString = "refresh-cw";
			this.statusBarIcon.ariaLabel = "Syncing...";
		} else {
			this.statusBarIconString = "circle-check";
			this.statusBarIcon.ariaLabel = "Synced!";
		}


		if (this.statusBarIconString != prevIconString)
			setIcon(this.statusBarIcon, this.statusBarIconString);

		const numItems = this.ridCache.length;
		this.statusBarText.setText(`${numItems} 🔭`);
	}

    validateSettings(): boolean {
        return (
            this.settings.koiApiUrl !== "" &&
            this.settings.koiApiKey !== ""
        );
    }

	async handleIconClick() {
		if (this.validateSettings()) {
			this.settings.paused = !this.settings.paused;
			this.updateStatusBar();
			if (!this.settings.initialized) {
				console.log("refreshing");
				await this.refreshKoi();
				this.settings.initialized = true;
			}
		} else {
			this.settings.paused = true;
			new Notice("Please set the API URL and key in the KOI plugin settings");
		}
		await this.saveSettings();
	}

	async syncKoi() {
		let events = [];

		if (this.settings.paused) return;
		if (this.syncMutex.isLocked()) return;

		if (!this.validateSettings()) {
			this.updateStatusBar();
			return;
		}
		console.log("syncing");

		try {
			events = await this.koiInterface.pollEvents();
		} catch (err) {
			if (err.status !== 404) throw err;
			await this.koiInterface.subscribeToEvents();
			await this.refreshKoi();
			return;
		} finally {
			this.updateStatusBar();
		}

		if (events.length === 0) return;

		console.log("attempting sync");
		const release = await this.syncMutex.acquire();
		this.updateStatusBar();

		try {
			console.log("acquired sync mutex");
			console.log(`processing ${events.length} events`)

			for (const event of events) {
				console.log(`${event.event_type}: ${event.rid}`);

				if (event.event_type == 'NEW' || event.event_type == 'UPDATE') {
					const bundle = await this.koiInterface.getObject(event.rid);
					if (bundle) {
						await this.ridCache.write(event.rid, bundle);
						await this.fileFormatter.write(event.rid);
						this.updateStatusBar();
					}
					
				} else if (event.event_type == 'FORGET') {
					await this.ridCache.delete(event.rid);
					await this.fileFormatter.delete(event.rid);
					this.updateStatusBar();
				}
			}
		} finally {
			release();
			this.updateStatusBar();
			console.log("released sync mutex");
		}
	}

	async refreshKoi() {
		console.log("attempting refresh");
		const release = await this.syncMutex.acquire();
		this.updateStatusBar();

		try {
			console.log("acquired sync mutex");

			const remoteManifests = await this.koiInterface.getManifests();
			if (!remoteManifests) return;

			const remoteRids: Array<string> = [];

			console.log(`fetched ${remoteManifests.length} rids`);

			for (const manifest of remoteManifests) {
				if (this.settings.paused) break;

				remoteRids.push(manifest.rid);

				const bundle = await this.ridCache.read(manifest.rid);
				if (!bundle || JSON.stringify(bundle.manifest) !== JSON.stringify(manifest)) {
					console.log("writing", manifest.rid);

					const remoteBundle = await this.koiInterface.getObject(manifest.rid);
					if (remoteBundle) {
						await this.ridCache.write(manifest.rid, remoteBundle);
						await this.fileFormatter.write(manifest.rid);
						this.updateStatusBar();
					}
				}
			}


			const localRids = await this.ridCache.readAllRids();
			// console.log("local rids", localRids);

			for (const localRid of localRids) {
				if (!remoteRids.includes(localRid)) {
					console.log("deleting", localRid);
					await this.ridCache.delete(localRid);
					await this.fileFormatter.delete(localRid);
					this.updateStatusBar();
				}
			}
		} finally {
			console.log("released sync mutex");
			release();
			this.updateStatusBar();
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}