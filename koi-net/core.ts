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
import { ActionContext, HandlerContext } from "./context";
import { KnowledgePipeline } from "./processor/knowledge_pipeline";
import { Actor } from "./actor";
import { NodeLifecycle } from "./lifecycle";
import { dereferenceKoiNode } from "./default_actions";
import { NodePoller } from "./poller";


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
    actionContext: ActionContext;
    handlerContext: HandlerContext;
    pipeline: KnowledgePipeline;
    actor: Actor;
    poller: NodePoller;
    lifecycle: NodeLifecycle;
    
    constructor({cache, config}: {
        cache: KoiCache;
        config: KoiNetConfigSchema;
    }) {
        this.config = config;
        this.cache = cache;

        this.identity = new NodeIdentity(this.config);
        this.effector = new Effector({...this});
        this.graph = new NetworkGraph({...this});
        this.secure = new Secure({...this});
        this.requestHandler = new RequestHandler({...this})
        this.resolver = new NetworkResolver({...this});
        this.eventQueue = new NetworkEventQueue({...this});
        this.actor = new Actor({...this});

        this.actionContext = new ActionContext({...this});
        this.handlerContext = new HandlerContext({...this});
        this.pipeline = new KnowledgePipeline({...this});
        this.processor = new ProcessorInterface({...this});

        this.handlerContext.setProcessor(this.processor);
        this.effector.setProcessor(this.processor);
        this.effector.setResolver(this.resolver);
        this.effector.setActionContext(this.actionContext);

        this.lifecycle = new NodeLifecycle({...this});
        this.poller = new NodePoller({...this});

        this.pipeline.addHandler(basicRidHandler);
        this.pipeline.addHandler(basicManifestHandler);
        this.pipeline.addHandler(secureProfileHandler);
        this.pipeline.addHandler(edgeNegotiationHandler);
        this.pipeline.addHandler(coordinatorContact);
        this.pipeline.addHandler(basicNetworkOutputFilter);
        this.pipeline.addHandler(forgetEdgeOnNodeDeletion);

        this.effector.registerAction({
            ridType: "orn:koi-net.node",
            action: dereferenceKoiNode
        });
    }
}