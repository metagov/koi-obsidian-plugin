import { requestUrl } from 'obsidian';
import type KoiPlugin from "main";
import type { KoiPluginSettings } from "settings";
import { RidBundle, RidEvent, RidManifest } from 'rid-lib-types';


export class KoiInterface {
    settings: KoiPluginSettings;
    plugin: KoiPlugin;

    constructor(plugin: KoiPlugin) {
        this.plugin = plugin;
        this.settings = plugin.settings;
    }

    async callApi(path: string, method: string = "GET") {
        try {
            const resp = await requestUrl({
                url: this.settings.koiApiUrl + path,
                headers: {
                    "X-API-Key": this.settings.koiApiKey
                },
                method: method
            });
            this.plugin.connected = true;
            return resp.json;
        } catch (err) {
            this.plugin.connected = (err.status === 404);
            // console.log(path);
            throw err;
        }
    }

    async subscribeToEvents() {
        const data = await this.callApi("/events/subscribe", "POST");
        this.settings.koiApiSubscriberId = data.subscriber_id;
        await this.plugin.saveSettings();
    }

    async pollEvents(): Promise<Array<RidEvent>> {
        return await this.callApi(
            `/events/poll/${this.settings.koiApiSubscriberId}`);
    }

    async getObject(rid: string): Promise<RidBundle> {
        // console.log("retrieving remote object", rid);
        return await this.callApi(`/object?rid=${rid}`);
    }

    async getRids(): Promise<Array<string>> {
        return await this.callApi("/rids");
    }

    async getManifests(): Promise<Array<RidManifest>> {
        return await this.callApi("/manifests");
    }
}