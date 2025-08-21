import { Event, EventType } from "koi-net/protocol/event";
import { Bundle } from "rid-lib/ext/bundle";
import { Manifest } from "rid-lib/ext/manifest";


export const STOP_CHAIN = Symbol("STOP_CHAIN");
export type StopChain = typeof STOP_CHAIN;


export class KnowledgeObject {
    constructor(
        public rid: string,
        public manifest?: Manifest,
        public contents?: Record<string, unknown>,
        public eventType?: EventType,
        public source?: string,
        public normalizedEventType?: EventType,
        public networkTargets: Array<string> = []
    ) {}

    static fromRid(
        rid: string,
        eventType?: EventType,
        source?: string
    ): KnowledgeObject {
        return new KnowledgeObject(rid, undefined, undefined, eventType, source);
    }

    static fromManifest(
        manifest: Manifest,
        eventType?: EventType,
        source?: string 
    ): KnowledgeObject {
        return new KnowledgeObject(
            manifest.rid, manifest, undefined, eventType, source
        );
    }

    static fromBundle(
        bundle: Bundle,
        eventType?: EventType,
        source?: string
    ): KnowledgeObject {
        return new KnowledgeObject(
            bundle.rid, bundle.manifest, bundle.contents, eventType, source
        );
    }

    static fromEvent(
        event: Event,
        source?: string
    ): KnowledgeObject {
        return new KnowledgeObject(
            event.rid, event.manifest, event.contents, event.event_type, source
        );
    }

    get bundle(): Bundle | undefined {
        if (!this.manifest || !this.contents) return undefined;
        return new Bundle(this.manifest, this.contents);
    }

    get normalizedEvent(): Event | undefined {
        if (!this.normalizedEventType)
            return;

        if (this.normalizedEventType === EventType.enum.FORGET)
            return new Event(this.rid, EventType.enum.FORGET);

        return new Event(
            this.rid, this.normalizedEventType, this.manifest, this.contents
        );
    }

    stringify() {
        return `<KObj '${this.rid}' event type: '${this.eventType}' -> '${this.normalizedEventType}', source: '${this.source}'>`;
    }
}
