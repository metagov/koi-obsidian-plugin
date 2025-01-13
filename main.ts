import { Plugin } from 'obsidian';
import * as Handlebars from 'handlebars';
import { Mutex } from 'async-mutex';
import { KoiPluginSettings, KoiSettingTab, DEFAULT_SETTINGS } from 'settings';
import { RidStorage } from 'rid-storage';
import { KoiInterface } from 'koi-interface';


export default class KoiPlugin extends Plugin {
	settings: KoiPluginSettings;
	statusBar: HTMLElement;
	connected: boolean;
	syncMutex: Mutex;
	ridStorage: RidStorage;
	koiInterface: KoiInterface;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new KoiSettingTab(this.app, this));

		this.ridStorage = new RidStorage(this.app, this.settings);
		this.koiInterface = new KoiInterface(this.settings, this);
		
		this.syncMutex = new Mutex();
		this.connected = false;

		this.statusBar = this.addStatusBarItem();
		await this.updateStatusBar();

		this.addCommand({
			id: 'refresh-with-koi',
			name: 'Refresh with KOI',
			callback: () => {
				this.refreshKoi();
			}
		});

		this.app.workspace.onLayoutReady(() => {
			this.setup();
		})

		
	}

	onunload() {

	}

	async setup() {
		if (!this.ridStorage.validateDirectory())
			await this.refreshKoi();

		if (this.settings.koiApiSubscriberId === "") {
			console.log("missing subcriber id");
            await this.koiInterface.subscribeToEvents();
			await this.refreshKoi();
		}

		this.syncKoi();
		this.registerInterval(
			window.setInterval(() => this.syncKoi(), 5 * 1000)
		);
	}

	async updateStatusBar() {
		let emoji = "✅"
		let syncing = this.syncMutex.isLocked();

		if (!this.connected)
			emoji = "❌";
		else if (syncing)
			emoji = "🔄";

		this.statusBar.setText(
			`KOI - ${emoji}`
		)
	}

	async syncKoi() {
		let events = [];

		console.log("syncing");

		try {
			events = await this.koiInterface.pollEvents();
			this.connected = true;
		} catch (err) {
			if (err.status === 404) {
				await this.koiInterface.subscribeToEvents();
				await this.refreshKoi();
			} else {
				this.connected = false;
				throw err;
			}
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
					this.koiInterface.getObject(event.rid)
						.then(bundle => this.ridStorage.write(event.rid, bundle))
						.catch(err => {
							console.error(err);
						});
					
				} else if (event.event_type == 'FORGET') {
					this.ridStorage.delete(event.rid);
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

		try {
			this.updateStatusBar();

			console.log("acquired sync mutex");

			const rids = await this.koiInterface.getRids();
			if (!rids) return;

			console.log(`fetched ${rids.length} rids`);

			for (const rid of (await this.ridStorage.readAllRids())) {
				if (!rids.includes(rid)) {
					this.ridStorage.delete(rid);
				}
			}

			for (const rid of rids) {
				console.log(`retrieving ${rid}`);

				this.koiInterface.getObject(rid)
					.then(bundle => this.ridStorage.write(rid, bundle))
					.catch(err => {
						console.error(err);
					});
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