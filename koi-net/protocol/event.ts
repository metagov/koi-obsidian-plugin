import { Manifest, ManifestSchema } from "rid-lib/ext/manifest";
import { z } from "zod";


export const EventType = z.enum(["NEW", "UPDATE", "FORGET"]);
export type EventType = z.infer<typeof EventType>;

export const EventSchema = z.object({
    rid: z.string(),
    event_type: EventType,
    manifest: z.optional(ManifestSchema),
    contents: z.optional(z.record(z.unknown()))
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
}