import { Actor } from "./actor";
import { KoiNetConfigSchema } from "./config";
import { Effector } from "./effector";
import { NodeIdentity } from "./identity";
import { NetworkGraph } from "./network/graph";
import { ProcessorInterface } from "./processor/interface";

export class NodeLifecycle {
    config: KoiNetConfigSchema;
    graph: NetworkGraph;
    processor: ProcessorInterface;
    effector: Effector;
    actor: Actor;
    identity: NodeIdentity;

    constructor({config, graph, processor, effector, actor, identity}: {
        config: KoiNetConfigSchema;
        graph: NetworkGraph;
        processor: ProcessorInterface;
        effector: Effector;
        actor: Actor;
        identity: NodeIdentity;
    }) {
        this.config = config;
        this.graph = graph;
        this.processor = processor;
        this.effector = effector;
        this.actor = actor;
        this.identity = identity;
    }

    async start() {
        await this.graph.generate();
        await this.effector.deref({rid: this.identity.rid, refreshCache: true});
        await this.processor.flushKobjQueue();

        if (
            !(await this.graph.getNeighbors()).length && 
            this.config.first_contact.rid
        ) {
            console.log("i dont have any neighbors, reaching out to first contact");
            this.actor.handshakeWith({
                target: this.config.first_contact.rid
            });
        }
    }

    async stop() {
        await this.processor.flushKobjQueue();
    }
}