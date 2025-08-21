import { Event, EventType } from "koi-net/protocol/event";
import { HandlerType, KnowledgeHandler } from "./handler";
import { KnowledgeObject, STOP_CHAIN, StopChain } from "./knowledge_object";
import { KoiCache } from "rid-lib/ext/cache";
import { NetworkInterface } from "koi-net/network/interface";
import { NodeIdentity } from "koi-net/identity";
import { Bundle } from "rid-lib/ext/bundle";
import { HandlerContext } from "koi-net/context";

export class KnowledgePipeline {
    handlerContext: HandlerContext;
    cache: KoiCache;
    network: NetworkInterface;
    identity: NodeIdentity;
    handlers: Array<KnowledgeHandler>;
    kobjQueue: Array<KnowledgeObject>;

    constructor({cache, network, identity, handlerContext}: {
        handlerContext: HandlerContext,
        cache: KoiCache,
        network: NetworkInterface,
        identity: NodeIdentity
    }) {
        this.handlerContext = handlerContext;
        this.cache = cache;
        this.network = network;
        this.identity = identity;
        this.handlers = [];
        this.kobjQueue = [];
    }

    addHandler(handler: KnowledgeHandler) {
        this.handlers.push(handler);
    }

    async callHandlerChain(handlerType: HandlerType, kobj: KnowledgeObject): Promise<KnowledgeObject | StopChain> {
        for (const handler of this.handlers) {
            if (handlerType != handler.handlerType) continue;
            // TODO: if (handler.ridTypes && )
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

    async process(kobj: KnowledgeObject) {
        console.log(`initial: ${kobj.stringify()}`);

        let resp = await this.callHandlerChain(HandlerType.RID, kobj);
        if (resp === STOP_CHAIN) return;
        kobj = resp;

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

                // TODO: call request handler
            }

            resp = await this.callHandlerChain(HandlerType.Manifest, kobj);
            if (resp === STOP_CHAIN) return;
            kobj = resp;

            console.log(`manifest: ${kobj.stringify()}`);

            if (!kobj.bundle) {
                console.log("bundle not found")
                if (!kobj.manifest) return;

                // TODO: call request handler
            }
        }

        resp = await this.callHandlerChain(HandlerType.Bundle, kobj);
        if (resp === STOP_CHAIN) return;
        kobj = resp;

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
            await this.network.graph.generate();
        }

        resp = await this.callHandlerChain(HandlerType.Network, kobj);
        if (resp === STOP_CHAIN) return;
        kobj = resp;

        console.log(`network: ${kobj.stringify()}`);

        if (kobj.networkTargets.length > 0) {
            for (const node of kobj.networkTargets) {
                await this.network.pushEventTo({
                    node, event: kobj.normalizedEvent as Event
                });
                await this.network.flushWebhookQueue(node);
            }
        }

        await this.callHandlerChain(HandlerType.Final, kobj);
        console.log(`final: ${kobj.stringify()}`);
    }
}