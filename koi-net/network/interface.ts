import { NodeIdentity } from "koi-net/identity";
import { KoiCache } from "rid-lib/ext/cache";
import { NetworkGraph } from "./graph";
import { RequestHandler } from "./request_handlers";
import { Event } from "koi-net/protocol/event";
import { KoiPluginSettings } from "settings";
import { PollEventsReq } from "koi-net/protocol/api_models";
import { NodeType } from "koi-net/protocol/node";


export class NetworkInterface {
    settings: KoiPluginSettings;
    identity: NodeIdentity;
    cache: KoiCache;
    graph: NetworkGraph;
    requestHandler: RequestHandler;
    // response handler?
    pollEventQueue: Record<string, Array<Event>>;
    webhookEventQueue: Record<string, Array<Event>>;

    constructor({cache, identity, settings}: {
        cache: KoiCache,
        identity: NodeIdentity,
        settings: KoiPluginSettings
    }) {
        this.identity = identity;
        this.cache = cache;
        this.settings = settings;

        this.graph = new NetworkGraph(cache, identity);
        this.requestHandler = new RequestHandler({
            cache, 
            graph: this.graph, 
            settings: this.settings
        })

        this.pollEventQueue = {};
        this.webhookEventQueue = {}
    }

    async pollNeighbors(): Promise<Array<Event>> {
        const neighbors = await this.graph.getNeighbors();
        const req = PollEventsReq.parse({ rid: this.identity.rid });

        if (!neighbors && this.settings.firstContact) {
            const payload = await this.requestHandler.pollEvents({
                url: this.settings.firstContact, req
            });
            return payload.events;
        }
        
        const events: Array<Event> = [];
        for (const nodeRid of neighbors) {
            const nodeProfile = await this.graph.getNodeProfile(nodeRid);
            if (!nodeProfile || nodeProfile.node_type != NodeType.enum.FULL)
                continue;

            const payload = await this.requestHandler.pollEvents({ nodeRid, req });
            events.push(...payload.events);
        }
        return events;
    }
}