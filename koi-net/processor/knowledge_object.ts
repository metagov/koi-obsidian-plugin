import { Event, EventType } from "koi-net/protocol/event";
import { Bundle } from "rid-lib/ext/bundle";
import { Manifest, ManifestSchema } from "rid-lib/ext/manifest";
import { z } from "zod";

export type KnowledgeEventType = EventType | null;

export enum KnowledgeSource {
    Internal = "INTERNAL",
    External = "EXTERNAL"
}

// export const KnowledgeObjectSchema = z.object({
//     rid: z.string(),
//     manifest: ManifestSchema.optional(),
//     contents: z.record(z.any()).optional(),
//     event_type: EventType.optional(),
//     normalized_event_type: EventType.optional(),
//     source: KnowledgeSource,
//     network_targets: z.array(z.string())
// });

export class KnowledgeObject {
    rid?: string;
    manifest?: Manifest;
    contents?: Record<string, unknown>;
    eventType?: KnowledgeEventType = null;
    normalizedEventType?: KnowledgeEventType = null;
    source: KnowledgeSource = KnowledgeSource.External;
    networkTargets: Array<string> = [];

    constructor(
        {rid, manifest, contents, eventType, normalizedEventType, source}: {
            rid?: string;
            manifest?: Manifest;
            contents?: Record<string, unknown>;
            eventType?: KnowledgeEventType;
            normalizedEventType?: KnowledgeEventType;
            source: KnowledgeSource;
        }
    ) {
        this.rid = rid;
        this.manifest = manifest;
        this.contents = contents;
        this.eventType = eventType;
        this.normalizedEventType = normalizedEventType;
        this.source = source;
    }

    static fromRid(
        rid: string,
        eventType: KnowledgeEventType = null,
        source: KnowledgeSource = KnowledgeSource.Internal
    ): KnowledgeObject {
        return new KnowledgeObject({ rid, eventType, source });
    }

    static fromManifest(
        manifest: Manifest,
        eventType: KnowledgeEventType = null,
        source: KnowledgeSource = KnowledgeSource.Internal
    ): KnowledgeObject {
        return new KnowledgeObject({ rid: manifest.rid, manifest, event_type: eventType, source });
    }

    static fromBundle(
        bundle: Bundle,
        eventType: KnowledgeEventType = null,
        source: KnowledgeSource = KnowledgeSource.Internal
    ): KnowledgeObject {
        return new KnowledgeObject({
            rid: bundle.rid,
            manifest: bundle.manifest,
            contents: bundle.contents,
            eventType,
            source,
        });
    }

    static fromEvent(
        event: Event,
        source: KnowledgeSource = KnowledgeSource.Internal
    ): KnowledgeObject {
        return new KnowledgeObject({
            rid: event.rid,
            manifest: event.manifest,
            contents: event.contents,
            eventType: event.event_type,
            source,
        });
    }

    get bundle(): Bundle | undefined {
        if (!this.manifest || !this.contents) return undefined;
        return new Bundle({ manifest: this.manifest, contents: this.contents });
    }

    get normalized_event(): Event {
        if (this.normalizedEventType == null) {
            throw new Error("Internal event's normalized event type is null, cannot convert to Event");
        }

        if (this.normalizedEventType === EventType.FORGET) {
            return new Event({ rid: this.rid, event_type: EventType.FORGET });
        }

        return new Event({
            rid: this.rid,
            event_type: this.normalizedEventType,
            manifest: this.manifest,
            contents: this.contents,
        });
    }
}
