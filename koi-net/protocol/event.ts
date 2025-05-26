import { Bundle } from "rid-lib/ext/bundle";
import { Manifest, ManifestSchema } from "rid-lib/ext/manifest";
import { z } from "zod";


export const EventType = z.enum(["NEW", "UPDATE", "FORGET"]);
export type EventType = z.infer<typeof EventType>;

export const EventSchema = z.object({
    rid: z.string(),
    event_type: EventType,
    manifest: ManifestSchema.optional(),
    contents: z.record(z.unknown()).optional()
}).transform(obj => new Event(obj));

export class Event {
    rid: string;
    event_type: EventType;
    manifest?: Manifest;
    contents?: Record<string, unknown>;

    constructor({rid, event_type, manifest, contents}: {
        rid: string;
        event_type: EventType;
        manifest?: Manifest;
        contents?: Record<string, unknown>;
    }) {    
        this.rid = rid;
        this.event_type = event_type;
        this.manifest = manifest;
        this.contents = contents
    }

    static validate(obj: Record<string, unknown>): Event {
        return EventSchema.parse(obj);
    }

    static fromBundle(event_type: EventType, bundle: Bundle): Event {
        return new Event({
            rid: bundle.manifest.rid,
            event_type,
            manifest: bundle.manifest,
            contents: bundle.contents,
        });
    }

    static fromManifest(event_type: EventType, manifest: Manifest): Event {
        return new Event({
            rid: manifest.rid,
            event_type,
            manifest,
        });
    }

    static fromRID(event_type: EventType, rid: string): Event {
        return new Event({
            rid,
            event_type,
        });
    }

    get bundle(): Bundle | undefined {
        if (this.manifest && this.contents) {
            return new Bundle({
                manifest: this.manifest,
                contents: this.contents,
            });
        }
        return undefined;
    }
}