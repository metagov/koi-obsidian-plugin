import { requestUrl } from 'obsidian';
import type KoiPlugin from "main";
import type { KoiPluginSettings } from "settings";
import { RidBundle, RidEvent } from 'rid-lib-types';


export class KoiInterface {
    settings: KoiPluginSettings;
    plugin: KoiPlugin;

    constructor(settings: KoiPluginSettings, plugin: KoiPlugin) {
        this.settings = settings;
        this.plugin = plugin;
    }

    async callApi(path: string, method: string = "GET") {
        const resp = await requestUrl({
            url: this.settings.koiApiUrl + path,
            headers: {
                "X-API-Key": this.settings.koiApiKey
            },
            method: method
        });

        return resp.json;
    }

    async subscribeToEvents() {
        const data = await this.callApi("/events/subscribe", "POST");
        this.settings.koiApiSubscriberId = data.subscriber_id;
        await this.plugin.saveSettings();
    }

    async pollEvents(): Promise<Array<RidEvent>> {
        const events = await this.callApi(
            `/events/poll/${this.settings.koiApiSubscriberId}`);
        return events;
    }

    async getObject(rid: string): Promise<RidBundle> {
        const bundle = await this.callApi(
            `/object?rid=${rid}`);
        return bundle;
    }

    async getRids(): Promise<Array<string>> {
        const rids = await this.callApi("/rids");
        return rids
    }
}