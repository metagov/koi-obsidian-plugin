import { NodeIdentity } from "koi-net/identity";
import { KoiCache } from "rid-lib/ext/cache";
import { NetworkGraph } from "./graph";
import { RequestHandler } from "./request_handlers";
import { KoiEvent } from "koi-net/protocol/event";
import { PollEventsReq } from "koi-net/protocol/api_models";
import { NodeProfileSchema, NodeType } from "koi-net/protocol/node";
import { EdgeType } from "koi-net/protocol/edge";
import { KoiNetConfigSchema } from "koi-net/config";
import { Effector } from "koi-net/effector";


export class NetworkResolver {
    config: KoiNetConfigSchema;
    effector: Effector;
    identity: NodeIdentity;
    cache: KoiCache;
    graph: NetworkGraph;
    requestHandler: RequestHandler;

    constructor({ cache, identity, config, graph, requestHandler, effector }: {
        cache: KoiCache,
        identity: NodeIdentity,
        config: KoiNetConfigSchema,
        graph: NetworkGraph,
        requestHandler: RequestHandler,
        effector: Effector
    }) {
        this.identity = identity;
        this.cache = cache;
        this.config = config;
        this.graph = graph;
        this.requestHandler = requestHandler;
        this.effector = effector;
    }

    async pollNeighbors(): Promise<Record<string, Array<KoiEvent>>> {
        const graphNeighbors = await this.graph.getNeighbors();
        const neighbors = new Set<string>();

        if (graphNeighbors.length) {
            for (const nodeRid of graphNeighbors) {
                const nodeBundle = await this.cache.read(nodeRid);
                if (!nodeBundle) continue;
                const nodeProfile = nodeBundle.validateContents(NodeProfileSchema);
                if (nodeProfile.node_type !== "FULL") continue;
                neighbors.add(nodeRid);
            }
        } else if (this.config.first_contact.rid) {
            neighbors.add(this.config.first_contact.rid);
        }

        const eventsMap: Record<string, Array<KoiEvent>> = {};
        for (const nodeRid of neighbors) {
            const payload = await this.requestHandler.pollEvents({ 
                node: nodeRid, 
                req: {limit: 0} 
            });
            
            if (payload.type !== "events_payload") {
                continue;
            }
            
            if (payload.events) {
                eventsMap[nodeRid] = payload.events;
            }
        }
        return eventsMap;
    }
}