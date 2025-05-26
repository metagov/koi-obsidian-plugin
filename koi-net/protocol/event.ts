import { Bundle } from "rid-lib/ext/bundle";
import { Manifest } from "rid-lib/ext/manifest";
import { z } from "zod";


export const EventType = z.enum(["NEW", "UPDATE", "FORGET"]);
export type EventType = z.infer<typeof EventType>;


export class Event {
    constructor(
        public rid: string,
        public event_type: EventType,
        public manifest?: Manifest,
        public contents?: Record<string, unknown>
    ) {}

    static schema = z.object({
        rid: z.string(),
        event_type: EventType,
        manifest: Manifest.schema.optional(),
        contents: z.record(z.unknown()).optional()
    });

    static validate(obj: Record<string, unknown>): Event {
        const eventObj = this.schema.parse(obj);
        return new Event(
            eventObj.rid,
            eventObj.event_type,
            eventObj.manifest,
            eventObj.contents
        )
    }

    static fromBundle(event_type: EventType, bundle: Bundle): Event {
        return new Event(
            bundle.manifest.rid,
            event_type,
            bundle.manifest,
            bundle.contents,
        );
    }

    static fromManifest(event_type: EventType, manifest: Manifest): Event {
        return new Event(
            manifest.rid,
            event_type,
            manifest,
        );
    }

    static fromRID(event_type: EventType, rid: string): Event {
        return new Event(
            rid,
            event_type,
        );
    }

    get bundle(): Bundle | undefined {
        if (this.manifest && this.contents) {
            return new Bundle(
                this.manifest,
                this.contents
            );
        }
        return undefined;
    }
}