import { Plugin, TFile, normalizePath } from 'obsidian';
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
	handleBarTemplate: Handlebars.TemplateDelegate;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new KoiSettingTab(this.app, this));

		this.ridStorage = new RidStorage(this);
		this.koiInterface = new KoiInterface(this);
		
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

		this.registerEvent(
			this.app.vault.on('modify', async (file: TFile) => {
				if (file.name !== this.settings.templatePath) return;
				await this.handleBarCompile();
				console.log("file modified:", file);
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
		if (!this.ridStorage.validateDirectory())
			await this.refreshKoi();

		if (this.settings.koiApiSubscriberId === "") {
			console.log("missing subcriber id");
            await this.koiInterface.subscribeToEvents();
			await this.refreshKoi();
		}

		await this.handleBarCompile();

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

	async handleBarCompile() {
		const file = this.app.vault.getFileByPath(
			normalizePath(this.settings.templatePath));

		console.log(this.settings.templatePath);

		if (!file) return;
		const templateString = await this.app.vault.read(file);
		console.log(templateString);
		this.handleBarTemplate = Handlebars.compile(templateString);
	}

	async syncKoi() {
		let events = [];

		if (this.syncMutex.isLocked()) return;

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
					const bundle = await this.koiInterface.getObject(event.rid);
					if (bundle) this.ridStorage.write(event.rid, bundle);
					
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
		this.updateStatusBar();

		try {
			console.log("acquired sync mutex");

			const remoteRids = await this.koiInterface.getRids();
			if (!remoteRids) return;

			console.log(`fetched ${remoteRids.length} rids`);

			const localRids = await this.ridStorage.readAllRids();
			console.log("local rids", localRids);

			for (const localRid of localRids) {
				if (!remoteRids.includes(localRid)) {
					this.ridStorage.delete(localRid);
				}
			}

			for (const rid of remoteRids) {
				console.log(`retrieving ${rid}`);

				const bundle = await this.koiInterface.getObject(rid);
				if (bundle) this.ridStorage.write(rid, bundle);
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