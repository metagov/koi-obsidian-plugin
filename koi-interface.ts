/*

import { requestUrl } from 'obsidian';
import type KoiPlugin from "main";
import type { KoiPluginSettings } from "settings";
import { BROADCAST_EVENTS_PATH, POLL_EVENTS_PATH, FETCH_RIDS_PATH, FETCH_MANIFESTS_PATH, FETCH_BUNDLES_PATH, PollEventsReq, FetchRidsReq, FetchManifestsReq, FetchBundlesReq, RidsPayload, ManifestsPayload, BundlesPayload, EventsPayload } from 'koi-net-api-models';

export class KoiInterface {
    settings: KoiPluginSettings;
    plugin: KoiPlugin;

    constructor(plugin: KoiPlugin) {
        this.plugin = plugin;
        this.settings = plugin.settings;
    }

    

    // async subscribeToEvents() {
    //     const data = await this.callApi("/events/subscribe", "POST");
    //     this.settings.koiApiSubscriberId = data.subscriber_id;
    //     await this.plugin.saveSettings();
    // }

    // async pollEvents(): Promise<Array<RidEvent>> {
    //     return await this.callApi(
    //         `/events/poll/${this.settings.koiApiSubscriberId}`);
    // }

    // async getObject(rid: string): Promise<RidBundle> {
    //     // console.log("retrieving remote object", rid);
    //     return await this.callApi(`/object?rid=${rid}`);
    // }

    // async getRids(): Promise<Array<string>> {
    //     return await this.callApi("/rids");
    // }

    // async getManifests(): Promise<Array<RidManifest>> {
    //     return await this.callApi("/manifests");
    // }

    async broadcastEvents(req: EventsPayload): Promise<void> {
        await this.callApi(BROADCAST_EVENTS_PATH, req);
    }

    async pollEvents(req: PollEventsReq): Promise<EventsPayload> {
        return await this.callApi(POLL_EVENTS_PATH, req);
    }

    async fetchRids(req: FetchRidsReq): Promise<RidsPayload> {
        return await this.callApi(FETCH_RIDS_PATH, req);
    }

    async fetchManifests(req: FetchManifestsReq): Promise<ManifestsPayload> {
        return await this.callApi(FETCH_MANIFESTS_PATH, req);
    }

    async fetchBundles(req: FetchBundlesReq): Promise<BundlesPayload> {
        return await this.callApi(FETCH_BUNDLES_PATH, req);
    }
}

*/