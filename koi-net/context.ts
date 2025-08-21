import { NodeIdentity } from "./identity";
import { Effector } from "./effector";
import { KoiCache } from "rid-lib/ext/cache";
import { NetworkGraph } from "./network/graph";
import { NetworkEventQueue } from "./network/event_queue";
import { RequestHandler } from "./network/request_handlers";
import { ProcessorInterface } from "./processor/interface";
// NodeConfig is not found in your TypeScript codebase, so you may need to define or import it if it exists elsewhere.

export class ActionContext {
    identity: NodeIdentity;
    effector: Effector;

    constructor(identity: NodeIdentity, effector: Effector) {
        this.identity = identity;
        this.effector = effector;
    }
}

export class HandlerContext {
    identity: NodeIdentity;
    // config: NodeConfig; // Uncomment and import if NodeConfig exists in TS
    cache: KoiCache;
    eventQueue: NetworkEventQueue;
    graph: NetworkGraph;
    requestHandler: RequestHandler;
    effector: Effector;
    private _processor?: ProcessorInterface;

    constructor(
        identity: NodeIdentity,
        // config: NodeConfig, // Uncomment and import if NodeConfig exists in TS
        cache: KoiCache,
        eventQueue: NetworkEventQueue,
        graph: NetworkGraph,
        requestHandler: RequestHandler,
        effector: Effector
    ) {
        this.identity = identity;
        // this.config = config; // Uncomment if NodeConfig exists
        this.cache = cache;
        this.eventQueue = eventQueue;
        this.graph = graph;
        this.requestHandler = requestHandler;
        this.effector = effector;
        this._processor = undefined;
    }

    setProcessor(processor: ProcessorInterface) {
        this._processor = processor;
    }

    get handle() {
        return this._processor?.handle;
    }
}