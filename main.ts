import { App, normalizePath, Plugin, PluginSettingTab, requestUrl, Setting } from 'obsidian';
import * as Handlebars from 'handlebars';
import { Mutex } from 'async-mutex';

// Remember to rename these classes and interfaces!

interface KoiPluginSettings {
	koiApiUrl: string;
	koiApiKey: string;
	koiApiSubscriberId: string;
	koiSyncDirectoryPath: string;
	templatePath: string;
}

const DEFAULT_SETTINGS: KoiPluginSettings = {
	koiApiUrl: "https://telescope-koi.lukvmil.com",
	koiApiKey: "",
	koiApiSubscriberId: "",
	koiSyncDirectoryPath: "telescope",
	templatePath: ""
}

export default class KoiPlugin extends Plugin {
	settings: KoiPluginSettings;
	statusBar: HTMLElement;
	connected: boolean = true;
	mutex = new Mutex();

	async onload() {
		await this.loadSettings();

		console.log(this.settings.koiApiUrl, this.settings.koiApiKey);

		this.syncKoi();
		this.registerInterval(
			window.setInterval(() => this.syncKoi(), 5 * 1000)
		);
		

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new KoiSettingTab(this.app, this));

		this.statusBar = this.addStatusBarItem();
		await this.updateStatusBar();

		this.addCommand({
			id: 'refresh-with-koi',
			name: 'Refresh with KOI',
			callback: () => {
				this.refreshKoi();
			}
		})

		this.addCommand({
			id: 'sync-with-koi',
			name: 'Sync with KOI',
			callback: () => {
				this.syncKoi();
			}
		})
	}

	onunload() {

	}

	async readLocalRids() {
		const rids = [];
		let listedfiles = await this.app.vault.adapter.list(this.settings.koiSyncDirectoryPath);
		for (const file_path of listedfiles.files) {
			const file_name = file_path.slice(
				this.settings.koiSyncDirectoryPath.length + 1,
				-3
			)
			const rid = atob(file_name);
			rids.push(rid);
		}

		return rids;
	}

	getRidPath(rid: string) {
		return normalizePath(`${this.settings.koiSyncDirectoryPath}/${btoa(rid)}.md`);
	}

	getRidFile(rid: string) {
		return this.app.vault.getAbstractFileByPath(this.getRidPath(rid));
	}

	async updateStatusBar() {
		let emoji = "✅"
		if (this.mutex.isLocked())
			emoji = "🔄";

		if (!this.connected)
			emoji = "❌";

		this.statusBar.setText(
			`KOI - ${emoji}`
		)
	}

	async callKoiApi(path: string, method: string = "GET") {
		try {
			const resp = await requestUrl({
				url: this.settings.koiApiUrl + path,
				headers: {
					"X-API-Key": this.settings.koiApiKey
				},
				method: method,
				throw: false
			})
			this.connected = true;
			let data = resp.json;
			return resp;
		} catch (e) {
			this.connected = false;
			throw e;
		} finally {
			this.updateStatusBar();
		}
	}

	async retrieveRidObject(rid: string) {
		let response = await this.callKoiApi(`/object?rid=${rid}`)

		let bundle = response.json;

		let msg_text = bundle.contents.text;
		delete bundle.contents.text;

		let text: string = "---\n" + JSON.stringify(bundle.contents) + "\n---\n>" + msg_text;

		this.app.vault.adapter.write(
			this.getRidPath(rid),
			text
		)
	}

	async registerAsSubscriber() {
		const resp = await this.callKoiApi("/events/subscribe", "POST");
		this.settings.koiApiSubscriberId = resp.json.subscriber_id;
		await this.saveSettings();
	}

	async syncKoi() {
		if (this.settings.koiApiSubscriberId == "")
			this.registerAsSubscriber();

		const resp = await this.callKoiApi(`/events/poll/${this.settings.koiApiSubscriberId}`);

		if (resp.status == 404) {
			this.registerAsSubscriber();
			this.refreshKoi();
			return;
		}

		let events = resp.json;
		if (events.length == 0) return;

		console.log("attempting sync");
	

		const release = await this.mutex.acquire();

		try {

			console.log("started sync");
			this.updateStatusBar();

			console.log(`processing ${events.length} events`)

			for (const event of events) {
				console.log(`${event.event_type}: ${event.rid}`);

				if (event.event_type == 'NEW' || event.event_type == 'UPDATE') {
					await this.retrieveRidObject(event.rid);
					
				} else if (event.event_type == 'FORGET') {
					let file = this.getRidFile(event.rid);
					if (file != null)
						this.app.vault.delete(file);
				}
			}

			
			console.log("ended sync");
		
		} finally {
			release();

			this.updateStatusBar();
		}
	}

	async refreshKoi() {
		console.log("attempting refresh");
		const release = await this.mutex.acquire();

		try {
			this.updateStatusBar();

			console.log("started refresh");

			const response = await this.callKoiApi("/rids");

			let folder = this.app.vault.getFolderByPath("koi");
			if (folder == null) {
				this.app.vault.createFolder("koi");
				console.log("couldn't find folder, creating new one");
			}

			const rids: string[] = response.json;

			console.log(`fetched ${rids.length} rids`);

			for (const rid of (await this.readLocalRids())) {
				if (!rids.includes(rid)) {
					let file = this.getRidFile(rid);
					if (file != null)
						this.app.vault.delete(file);
				}
			}

			for (const rid of rids) {
				console.log(`retrieving ${rid}`);
				await this.retrieveRidObject(rid);
			}
		} finally {

			console.log("ended refresh");

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

class KoiSettingTab extends PluginSettingTab {
	plugin: KoiPlugin;

	constructor(app: App, plugin: KoiPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('KOI API URL')
			.setDesc('URL of the KOI API this plugin will communicate with')
			.addText(text => text
				.setPlaceholder('https://...')
				.setValue(this.plugin.settings.koiApiUrl)
				.onChange(async (value) => {
					this.plugin.settings.koiApiUrl = value;
					await this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
			.setName('KOI API Key')
			.setDesc('Key for accessing KOI API')
			.addText(text => text
				.setPlaceholder('')
				.setValue(this.plugin.settings.koiApiKey)
				.onChange(async (value) => {
					this.plugin.settings.koiApiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('KOI API Subscriber ID')
			.setDesc('Subscriber ID for receiving RID events (set automatically)')
			.addText(text => text
				.setPlaceholder('')
				.setValue(this.plugin.settings.koiApiSubscriberId
			))
			.setDisabled(true);

		new Setting(containerEl)
			.setName('KOI Sync Directory Path')
			.setDesc('Directory used to store RID objects synced through KOI')
			.addText(text => text
				.setPlaceholder('koi')
				.setValue(this.plugin.settings.koiSyncDirectoryPath)
				.onChange(async (value) => {
					this.plugin.settings.koiSyncDirectoryPath = value;
					await this.plugin.saveSettings();
				})
			)
		
		new Setting(containerEl)
			.setName('Template file location')
			.setDesc('Will be used to generate documents imported from KOI')
			.addText(text => text
				.setPlaceholder('')
				.setValue(this.plugin.settings.templatePath)
				.onChange(async (value) => {
					this.plugin.settings.templatePath = value;
					await this.plugin.saveSettings();
				}));
	}
}
