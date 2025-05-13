import { NodeIdentity } from "koi-net/identity";
import { KoiCache } from "rid-lib/ext/cache";
import { NetworkGraph } from "./graph";
import { RequestHandler } from "./request_handlers";
import { Event } from "koi-net/protocol/event";
import { KoiPluginSettings } from "settings";


export class NetworkInterface {
    settings: KoiPluginSettings;
    identity: NodeIdentity;
    cache: KoiCache;
    graph: NetworkGraph;
    requestHandler: RequestHandler;
    // response handler?
    pollEventQueue: Record<string, Array<Event>>;
    webhookEventQueue: Record<string, Array<Event>>;

    constructor({cache, identity}: {
        cache: KoiCache,
        identity: NodeIdentity,
        settings: KoiPluginSettings
    }) {
        this.identity = identity;
        this.cache = cache;
        this.settings = this.settings;

        this.graph = new NetworkGraph(cache, identity);
        this.requestHandler = new RequestHandler({
            cache, 
            graph: this.graph, 
            settings: this.settings
        })

        this.pollEventQueue = {};
        this.webhookEventQueue = {}
    }
}