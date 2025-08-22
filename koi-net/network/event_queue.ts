import { NodeIdentity } from "koi-net/identity";
import { KoiCache } from "rid-lib/ext/cache";
import { NetworkGraph } from "./graph";
import { RequestHandler } from "./request_handlers";
import { Event } from "koi-net/protocol/event";
import { NodeProfileSchema, NodeType } from "koi-net/protocol/node";
import { Effector } from "koi-net/effector";
import { KoiNetConfigSchema } from "koi-net/config";


export class NetworkEventQueue {
    config: KoiNetConfigSchema;
    identity: NodeIdentity;
    effector: Effector;
    cache: KoiCache;
    graph: NetworkGraph;
    requestHandler: RequestHandler;
    webhookEventQueue: Record<string, Array<Event>>;

    constructor({cache, identity, config, graph, effector, requestHandler}: {
        cache: KoiCache,
        identity: NodeIdentity,
        effector: Effector,
        graph: NetworkGraph,
        config: KoiNetConfigSchema,
        requestHandler: RequestHandler
    }) {
        this.identity = identity;
        this.cache = cache;
        this.graph = graph;
        this.effector = effector;
        this.config = config;
        this.requestHandler = requestHandler;

        this.webhookEventQueue = {};
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
        } else if (node === this.config.first_contact.rid) {
            // allow
        } else {
            console.log("unknown node", node);
            return;
        }

        if (!(node in this.webhookEventQueue))
            this.webhookEventQueue[node] = [];

        this.webhookEventQueue[node].push(event);

        if (flush) {
            await this.flushWebhookQueue(node);
        }     
    }

    async flushWebhookQueue(node: string, requeueOnFail: boolean = true) {
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

            if (requeueOnFail) {
                queue.push(...events);
            }
        }
    }
}