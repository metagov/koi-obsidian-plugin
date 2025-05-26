import { Event, EventType } from "koi-net/protocol/event";
import { Bundle } from "rid-lib/ext/bundle";
import { KoiCache } from "rid-lib/ext/cache";
import { Manifest } from "rid-lib/ext/manifest";


export class ProcesorInterface {
    cache: KoiCache;

    handle(
        {rid, manifest, bundle, event, kobj, eventType, source}: {
            rid?: string,
            manifest?: Manifest,
            bundle?: Bundle,
            event?: Event,
            kobj?: any,
            eventType?: EventType,
            source?: any
        }
    ) {

    }
}