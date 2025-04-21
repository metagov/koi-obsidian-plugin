import { Cache } from "rid-lib/ext/cache";
import { 
    PollEventsReq, 
    FetchBundlesReq, 
    FetchManifestsReq, 
    FetchRidsReq, 
    EventsPayload, 
    RidsPayload, 
    ManifestsPayload, 
    BundlesPayload 
} from "koi-net/protocol/api_models";
import { 
    BROADCAST_EVENTS_PATH, 
    POLL_EVENTS_PATH, 
    FETCH_BUNDLES_PATH, 
    FETCH_MANIFESTS_PATH, 
    FETCH_RIDS_PATH 
} from "koi-net/protocol/consts";
import { requestUrl } from "obsidian";
import { NodeProfileSchema, NodeType } from "koi-net/protocol/node";
import { z } from "zod";

export class RequestHandler {
    cache?: Cache;
    apiKey?: string;

    constructor({cache, apiKey}: {
        cache?: Cache,
        apiKey?: string
    }) {
        this.cache = cache;
        this.apiKey = apiKey;
    }

    async makeRequest<T>({url, req, respModel}: {
        url: string,
        req?: EventsPayload | PollEventsReq | FetchRidsReq | FetchManifestsReq | FetchBundlesReq,
        respModel?: z.ZodType<T>
   }) {
        let headers: Record<string, string>;

        if (this.apiKey) {
            headers = {"X-API-Key": this.apiKey};
        } else {
            headers = {};
        }

        console.log(url, req);

        const resp = await requestUrl({
            url: url,
            headers: headers,
            method: "POST",
            body: req && JSON.stringify(req)
        });

        return respModel ? respModel.parse(resp.json) : resp.json;
    }

    async getUrl({nodeRid, url}: {
        nodeRid?: string,
        url?: string
    }): Promise<string> {
        if (nodeRid) {
            if (!this.cache)
                throw "no cache";
            const bundle = await this.cache.read(nodeRid);
            if (bundle === null)
                throw "Node not found";
            
            const nodeProfile = NodeProfileSchema.safeParse(bundle.contents);
            if (!nodeProfile.success)
                throw "Failed to parse node profile";

            if (nodeProfile.data.node_type !== NodeType.enum.FULL)
                throw "Can't query partial node";

            if (!nodeProfile.data.base_url)
                throw "Missing base url in node profile";

            return nodeProfile.data.base_url

        } else if (url) {
            return url;
        } else {
            throw "One of 'node_rid' and 'url' must be provided";
        }
    }

    async broadcastEvents({nodeRid, url, req}: {
        nodeRid?: string,
        url?: string
        req: EventsPayload
    }): Promise<void> {
            await this.makeRequest({
                url: (await this.getUrl({nodeRid, url})) + BROADCAST_EVENTS_PATH, 
                req: EventsPayload.parse(req)
            });
        }

    async pollEvents({nodeRid, url, req}: {
        nodeRid?: string,
        url?: string
        req: PollEventsReq
    }): Promise<EventsPayload> {
        return await this.makeRequest({
            url: (await this.getUrl({nodeRid, url})) + POLL_EVENTS_PATH, 
            req: PollEventsReq.parse(req),
            respModel: EventsPayload
        });
    }

    async fetchRids({nodeRid, url, req}: {
        nodeRid?: string,
        url?: string
        req: FetchRidsReq
    }): Promise<RidsPayload> {
        return await this.makeRequest({
            url: (await this.getUrl({nodeRid, url})) + FETCH_RIDS_PATH, 
            req: FetchRidsReq.parse(req),
            respModel: RidsPayload
        });
    }

    async fetchManifests({nodeRid, url, req}: {
        nodeRid?: string,
        url?: string
        req: FetchManifestsReq
    }): Promise<ManifestsPayload> {
        return await this.makeRequest({
            url: (await this.getUrl({nodeRid, url})) + FETCH_MANIFESTS_PATH, 
            req: FetchManifestsReq.parse(req),
            respModel: ManifestsPayload
        });
    }

    async fetchBundles({nodeRid, url, req}: {
        nodeRid?: string,
        url?: string
        req: FetchBundlesReq
    }): Promise<BundlesPayload> {
        return await this.makeRequest({
            url: (await this.getUrl({nodeRid, url})) + FETCH_BUNDLES_PATH, 
            req: FetchBundlesReq.parse(req),
            respModel: BundlesPayload
        });
    }
}