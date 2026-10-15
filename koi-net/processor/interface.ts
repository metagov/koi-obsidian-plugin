import { KoiEvent, EventType } from "koi-net/protocol/event";
import { Bundle } from "rid-lib/ext/bundle";
import { Manifest } from "rid-lib/ext/manifest";
import { KnowledgeObject } from "./knowledge_object";
import { KnowledgePipeline } from "./knowledge_pipeline";


export class ProcessorInterface {
    pipeline: KnowledgePipeline
    kobjQueue: Array<KnowledgeObject>;
    private activeFlush: Promise<void> | null;

    constructor({pipeline}: {
        pipeline: KnowledgePipeline
    }) {
        this.pipeline = pipeline;
        this.kobjQueue = [];
        this.activeFlush = null;
    }

    // only one flush loop runs at a time; callers arriving mid-flush share it,
    // and the running loop also drains anything they queued before calling
    flushKobjQueue(): Promise<void> {
        if (!this.activeFlush) {
            this.activeFlush = this.drainQueue().finally(() => {
                this.activeFlush = null;
            });
        }
        return this.activeFlush;
    }

    private async drainQueue() {
        while (this.kobjQueue.length > 0) {
            const kobj = this.kobjQueue.shift();
            if (kobj) {
                console.log(`Dequeued ${kobj.stringify()}`);
                try {
                    await this.pipeline.process(kobj);
                } catch (err) {
                    console.error(`Failed to process ${kobj.stringify()}`, err);
                }
            }
        }
    }

    handle({rid, manifest, bundle, event, kobj, eventType, source}: {
        rid?: string,
        manifest?: Manifest,
        bundle?: Bundle,
        event?: KoiEvent,
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

        console.log(`Queued ${_kobj.stringify()}`);
        this.kobjQueue.push(_kobj);
    }
}