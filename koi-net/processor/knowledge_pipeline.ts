import { Event, EventType } from "koi-net/protocol/event";
import { HandlerType, KnowledgeHandler } from "./handler";
import { KnowledgeObject, STOP_CHAIN, StopChain } from "./knowledge_object";
import { KoiCache } from "rid-lib/ext/cache";
import { NodeIdentity } from "koi-net/identity";
import { Bundle } from "rid-lib/ext/bundle";
import { HandlerContext } from "koi-net/context";
import { RequestHandler } from "koi-net/network/request_handlers";
import { NetworkEventQueue } from "koi-net/network/event_queue";
import { NetworkGraph } from "koi-net/network/graph";


export class KnowledgePipeline {
    handlerContext: HandlerContext;
    requestHandler: RequestHandler;
    cache: KoiCache;
    eventQueue: NetworkEventQueue;
    identity: NodeIdentity;
    graph: NetworkGraph;
    handlers: Array<KnowledgeHandler>;
    kobjQueue: Array<KnowledgeObject>;

    constructor({graph, cache, eventQueue, identity, handlerContext, requestHandler }: {
        graph: NetworkGraph,
        handlerContext: HandlerContext,
        cache: KoiCache,
        eventQueue: NetworkEventQueue,
        identity: NodeIdentity,
        requestHandler: RequestHandler
    }) {
        this.handlerContext = handlerContext;
        this.graph = graph;
        this.cache = cache;
        this.eventQueue = eventQueue;
        this.identity = identity;
        this.requestHandler = requestHandler;
        this.handlers = [];
        this.kobjQueue = [];
    }

    addHandler(handler: KnowledgeHandler) {
        this.handlers.push(handler);
    }

    async callHandlerChain(handlerType: HandlerType, kobj: KnowledgeObject): Promise<KnowledgeObject | StopChain> {
        for (const handler of this.handlers) {
            if (handlerType != handler.handlerType) continue;
            if (handler.ridTypes) {
                let match: boolean = false;
                for (const ridType of handler.ridTypes) {
                    if (kobj.rid.startsWith(ridType))
                        match = true;
                }
                if (!match) continue;
            }
            if (handler.source && handler.source != kobj.source) continue;
            if (handler.eventTypes && !(handler.eventTypes.includes(kobj.eventType))) continue;

            const resp = handler.func(this.handlerContext, kobj);
            const result = (resp instanceof Promise) ? await resp : resp;

            if (result === STOP_CHAIN) {
                return STOP_CHAIN;
            } else if (result === undefined) {
                continue
            } else {
                kobj = result;
            }
        }

        return kobj;
    }

    async process(_kobj: KnowledgeObject) {
        let kobj: KnowledgeObject | StopChain = _kobj;
        
        console.log(`initial: ${kobj.stringify()}`);

        kobj = await this.callHandlerChain(HandlerType.RID, kobj);
        if (kobj === STOP_CHAIN) return;

        console.log(`rid: ${kobj.stringify()}`);

        if (kobj.eventType === EventType.enum.FORGET) {
            const bundle = await this.cache.read(kobj.rid);
            if (!bundle) return;

            kobj.manifest = bundle.manifest;
            kobj.contents = bundle.contents;

        } else {
            if (!kobj.manifest) {
                console.log("manifest not found");
                
                if (!kobj.source) return;

                console.log("attempting to fetch manifest")

                const payload = await this.requestHandler.fetchManifests({
                    node: kobj.source,
                    req: {rids: [kobj.rid]}
                })

                if (!payload.manifests) {
                    console.warn("failed to find manifest");
                    return;
                }

                kobj.manifest = payload.manifests[0];
            }

            kobj = await this.callHandlerChain(HandlerType.Manifest, kobj);
            if (kobj === STOP_CHAIN) return;

            console.log(`manifest: ${kobj.stringify()}`);

            if (!kobj.bundle) {
                console.log("bundle not found")

                if (!kobj.source) return;

                console.log("attempting to fetch bundle")

                const payload = await this.requestHandler.fetchBundles({
                    node: kobj.source,
                    req: {rids: [kobj.rid]}
                })

                if (!payload.bundles) {
                    console.warn("failed to find bundle");
                    return;
                }

                const { manifest, contents } = payload.bundles[0];

                kobj.manifest = manifest;
                kobj.contents = contents;
            }
        }

        kobj = await this.callHandlerChain(HandlerType.Bundle, kobj);
        if (kobj === STOP_CHAIN) return;

        console.log(`bundle: ${kobj.stringify()}`);


        if (kobj.normalizedEventType === EventType.enum.NEW || 
            kobj.normalizedEventType === EventType.enum.UPDATE) {
            console.log("writing to cache");
            await this.cache.write(kobj.bundle as Bundle);
        } else if (kobj.normalizedEventType === EventType.enum.FORGET) {
            console.log("deleting from cache");
            await this.cache.delete(kobj.rid);
        } else {
            console.log("no normalized event set, exiting...");
            return;
        }

        if (kobj.rid.startsWith("orn:koi-net.node") || 
            kobj.rid.startsWith("orn:koi-net.edge")) {
            await this.graph.generate();
        }

        kobj = await this.callHandlerChain(HandlerType.Network, kobj);
        if (kobj === STOP_CHAIN) return;

        console.log(`network: ${kobj.stringify()}`);

        for (const node of kobj.networkTargets) {
            await this.eventQueue.pushEventTo({
                node, event: kobj.normalizedEvent as Event
            });
            await this.eventQueue.flushWebhookQueue(node);
        }

        await this.callHandlerChain(HandlerType.Final, kobj);
        console.log(`final: ${kobj.stringify()}`);
    }
}