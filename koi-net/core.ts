import { KoiCache } from "rid-lib/ext/cache";
import { NodeIdentity } from "./identity";
import { NetworkResolver } from "./network/resolver";
import { ProcessorInterface } from "./processor/interface";
import { basicManifestHandler, basicNetworkOutputFilter, basicRidHandler, coordinatorContact, edgeNegotiationHandler, forgetEdgeOnNodeDeletion, secureProfileHandler } from "./processor/default_handlers";
import { RequestHandler } from "./network/request_handlers";
import { Effector } from "./effector";
import { NetworkGraph } from "./network/graph";
import { Secure } from "./secure";
import { KoiNetConfigSchema } from "./config";
import { NetworkEventQueue } from "./network/event_queue";
import { HandlerContext } from "./context";
import { KnowledgePipeline } from "./processor/knowledge_pipeline";
import { Actor } from "./actor";
import { NodeLifecycle } from "./lifecycle";


export class NodeInterface {
    config: KoiNetConfigSchema
    cache: KoiCache;
    identity: NodeIdentity;
    effector: Effector;
    secure: Secure;
    requestHandler: RequestHandler;
    network: NetworkResolver;
    processor: ProcessorInterface;
    graph: NetworkGraph;
    resolver: NetworkResolver;
    eventQueue: NetworkEventQueue;
    handlerContext: HandlerContext;
    pipeline: KnowledgePipeline;
    actor: Actor;
    lifecycle: NodeLifecycle;
    
    constructor({cache, config}: {
        cache: KoiCache;
        config: KoiNetConfigSchema;
    }) {
        this.cache = cache;
        this.config = config;

        this.identity = new NodeIdentity(this.config);
        this.effector = new Effector({...this});
        this.secure = new Secure({...this});
        this.graph = new NetworkGraph({...this});
        this.requestHandler = new RequestHandler({...this})
        this.resolver = new NetworkResolver({...this});
        this.eventQueue = new NetworkEventQueue({...this});
        this.handlerContext = new HandlerContext({...this});
        this.pipeline = new KnowledgePipeline({...this});
        this.processor = new ProcessorInterface({...this});
        this.actor = new Actor({...this});
        this.lifecycle = new NodeLifecycle({...this});

        this.pipeline.addHandler(basicRidHandler);
        this.pipeline.addHandler(basicManifestHandler);
        this.pipeline.addHandler(secureProfileHandler);
        this.pipeline.addHandler(edgeNegotiationHandler);
        this.pipeline.addHandler(coordinatorContact);
        this.pipeline.addHandler(basicNetworkOutputFilter);
        this.pipeline.addHandler(forgetEdgeOnNodeDeletion);
    }
}