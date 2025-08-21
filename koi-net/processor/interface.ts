import { Event, EventType } from "koi-net/protocol/event";
import { Bundle } from "rid-lib/ext/bundle";
import { Manifest } from "rid-lib/ext/manifest";
import { KnowledgeObject } from "./knowledge_object";
import { KnowledgePipeline } from "./knowledge_pipeline";


export class ProcessorInterface {
    pipeline: KnowledgePipeline
    kobjQueue: Array<KnowledgeObject>;

    constructor({pipeline}: {
        pipeline: KnowledgePipeline
    }) {
        this.pipeline = pipeline;
        this.kobjQueue = [];
    }

    async flushKobjQueue() {
        while (this.kobjQueue.length > 0) {
            const kobj = this.kobjQueue.shift();
            if (kobj) await this.pipeline.process(kobj);
        }
    }

    handle({rid, manifest, bundle, event, kobj, eventType, source}: {
        rid?: string,
        manifest?: Manifest,
        bundle?: Bundle,
        event?: Event,
        kobj?: KnowledgeObject,
        eventType?: EventType,
        source?: string
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