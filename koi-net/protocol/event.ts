import { Bundle } from "rid-lib/ext/bundle";
import { Manifest } from "rid-lib/ext/manifest";
import { z } from "zod";


export const EventType = z.enum(["NEW", "UPDATE", "FORGET"]);
export type EventType = z.infer<typeof EventType>;


export class KoiEvent {
    constructor(
        public rid: string,
        public event_type: EventType,
        public manifest?: Manifest,
        public contents?: Record<string, unknown>
    ) {}

    static schema = z.object({
        rid: z.string(),
        event_type: EventType,
        manifest: Manifest.schema.transform(m => Manifest.validate(m)).optional(),
        contents: z.record(z.unknown()).optional()
    });

    static validate(obj: Record<string, unknown>): KoiEvent {
        console.log("VALIDATING EVENT", obj);
        const eventObj = KoiEvent.schema.parse(obj);
        return new KoiEvent(
            eventObj.rid,
            eventObj.event_type,
            eventObj.manifest,
            eventObj.contents
        )
    }

    static fromBundle(event_type: EventType, bundle: Bundle): KoiEvent {
        return new KoiEvent(
            bundle.manifest.rid,
            event_type,
            bundle.manifest,
            bundle.contents,
        );
    }

    static fromManifest(event_type: EventType, manifest: Manifest): KoiEvent {
        return new KoiEvent(
            manifest.rid,
            event_type,
            manifest,
        );
    }

    static fromRID(event_type: EventType, rid: string): KoiEvent {
        return new KoiEvent(
            rid,
            event_type,
        );
    }

    get bundle(): Bundle | undefined {
        if (this.manifest && this.contents) {
            return new Bundle({
                manifest: this.manifest,
                contents: this.contents
            });
        }
        return undefined;
    }
}