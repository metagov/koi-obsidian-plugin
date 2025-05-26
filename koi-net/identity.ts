import { KoiCache } from "rid-lib/ext/cache";
import { NodeProfileSchema } from "./protocol/node";
import { Bundle } from "rid-lib/ext/bundle";


export class NodeIdentity {
    rid: string;
    profile: NodeProfileSchema;
    cache: KoiCache;

    constructor({rid, profile, cache}: {
        rid: string,
        profile: NodeProfileSchema,
        cache: KoiCache
    }) {
        this.rid = rid;
        this.profile = profile;
        this.cache = cache;
    }

    async bundle(): Promise<Bundle> {
        const bundle = await this.cache.read(this.rid);
        if (!bundle) throw "Identity bundle not in cache";
        return bundle;
    }
}
