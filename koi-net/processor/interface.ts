import { NodeIdentity } from "koi-net/identity";
import { NetworkInterface } from "koi-net/network/interface";
import { Event, EventType } from "koi-net/protocol/event";
import { Bundle } from "rid-lib/ext/bundle";
import { KoiCache } from "rid-lib/ext/cache";
import { Manifest } from "rid-lib/ext/manifest";
import { HandlerType, KnowledgeHandler } from "./handler";
import { KnowledgeObject, KnowledgeSource, STOP_CHAIN, StopChain } from "./knowledge_object";


export class ProcessorInterface {
    cache: KoiCache;
    network: NetworkInterface;
    identity: NodeIdentity;
    handlers: Array<KnowledgeHandler>;
    kobjQueue: Array<KnowledgeObject>;

    constructor({cache, network, identity}: {
        cache: KoiCache,
        network: NetworkInterface,
        identity: NodeIdentity
    }) {
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

            const resp = handler.func(this, kobj);
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

    async processKobj(kobj: KnowledgeObject) {
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
                console.log("manifest not found, locating...")
                let manifest;
                if (kobj.source === KnowledgeSource.External) {
                    // TODO: fetch remote manifest
                } else if (kobj.source === KnowledgeSource.Internal) {
                    const bundle = await this.cache.read(kobj.rid);
                    manifest = bundle ? bundle.manifest : null;
                }
                if (!manifest) return;
                kobj.manifest = manifest;
            }

            resp = await this.callHandlerChain(HandlerType.Manifest, kobj);
            if (resp === STOP_CHAIN) return;
            kobj = resp;

            console.log(`manifest: ${kobj.stringify()}`);

            if (!kobj.bundle) {
                let bundle;
                if (kobj.source === KnowledgeSource.External) {
                    // TODO: fetch remote manifest
                } else if (kobj.source === KnowledgeSource.Internal) {
                    bundle = await this.cache.read(kobj.rid);
                }
                if (!bundle) return;
                kobj.manifest = bundle.manifest;
                kobj.contents = bundle.contents;
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

    async flushKobjQueue() {
        while (this.kobjQueue.length > 0) {
            const kobj = this.kobjQueue.shift();
            if (kobj) await this.processKobj(kobj);
        }
    }

    handle({rid, manifest, bundle, event, kobj, eventType, source}: {
        rid?: string,
        manifest?: Manifest,
        bundle?: Bundle,
        event?: Event,
        kobj?: KnowledgeObject,
        eventType?: EventType,
        source?: KnowledgeSource
    }) {
        let _kobj: KnowledgeObject;
        if (rid) {
            _kobj = KnowledgeObject.fromRid(rid, eventType, source);
        } else if (manifest) {
            _kobj = KnowledgeObject.fromManifest(manifest, eventType, source);
        } else if (bundle) {
            _kobj = KnowledgeObject.fromBundle(bundle, eventType, source);
        } else if (event) {
            _kobj = KnowledgeObject.fromEvent(event, source);
        } else if (kobj) {
            _kobj = kobj;
        } else {
            throw "One of 'rid', 'manifest', 'bundle', 'event', or 'kobj' must be provided";
        }

        this.kobjQueue.push(_kobj);
    }
}