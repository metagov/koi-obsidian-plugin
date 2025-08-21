import { NodeIdentity } from "koi-net/identity";
import { KoiCache } from "rid-lib/ext/cache";
import { NetworkGraph } from "./graph";
import { RequestHandler } from "./request_handlers";
import { Event } from "koi-net/protocol/event";
import { KoiPluginSettings } from "settings";
import { PollEventsReq } from "koi-net/protocol/api_models";
import { NodeProfileSchema, NodeType } from "koi-net/protocol/node";
import { EdgeType } from "koi-net/protocol/edge";
import { Effector } from "koi-net/effector";


export class NetworkEventQueue {
    settings: KoiPluginSettings;
    identity: NodeIdentity;
    effector: Effector;
    cache: KoiCache;
    graph: NetworkGraph;
    requestHandler: RequestHandler;
    webhookEventQueue: Record<string, Array<Event>>;

    constructor({cache, identity, settings, graph, effector}: {
        cache: KoiCache,
        identity: NodeIdentity,
        effector: Effector,
        graph: NetworkGraph,
        settings: KoiPluginSettings
    }) {
        this.identity = identity;
        this.cache = cache;
        this.graph = graph;
        this.effector = effector;
        this.settings = settings;

        this.graph = new NetworkGraph(cache, identity);
        this.requestHandler = new RequestHandler({
            identity, effector, cache, graph, settings
        })

        this.webhookEventQueue = {}
    }

    async pushEventTo({ event, node, flush = false }: {
        event: Event,
        node: string,
        flush?: boolean
    }) {
        const nodeBundle = await this.effector.deref({rid: node});

        if (nodeBundle) {
            const nodeProfile = nodeBundle.validateContents(NodeProfileSchema);
    
            if (nodeProfile.node_type !== NodeType.enum.FULL) {
                console.log("Can't push event to partial node");
                return;
            }
        } else if (node === "TODO: first_contact") {

        }

        if (!(node in this.webhookEventQueue))
            this.webhookEventQueue[node] = [];

        this.webhookEventQueue[node].push(event);

        if (flush) {
            await this.flushWebhookQueue(node);
        }     
    }

    async flushWebhookQueue(node: string) {
        // const nodeProfile = await this.graph.getNodeProfile(node);

        // if (!nodeProfile) {
        //     console.log("Node unknown to me");
        //     return;
        // }
        // if (nodeProfile.node_type != NodeType.enum.FULL) {
        //     console.log("Can't push event to partial node");
        //     return;
        // }

        const queue = this.webhookEventQueue[node];
        
        if (!(node in queue))
            return;
        
        const events = queue.splice(0, queue.length);
        
        try {
            this.requestHandler.broadcastEvents({
                node: node,
                req: { events }
            })
        } catch (err) {
            console.error(err);
        }
    }
}