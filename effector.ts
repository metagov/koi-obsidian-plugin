import { KoiInterface } from "koi-interface";
import { RidCache } from "rid-cache";
import { RidBundle } from "telescope-types";

export class Effector {
    koiInterface: KoiInterface;
    ridCache: RidCache;

    constructor(koiInterface: KoiInterface, ridCache: RidCache) {
        this.koiInterface = koiInterface;
        this.ridCache = ridCache;
    }

    async dereference(rid: string): Promise<RidBundle | null> {
        const localBundle = await this.ridCache.read(rid);
        if (localBundle) {
            // console.log("hit cache", rid);
            return localBundle;
        }

        const remoteBundle = (await this.koiInterface.fetchBundles({"rids": [rid]})).bundles[0];
        if (!remoteBundle) return null;

        // console.log("hit api", rid);
        await this.ridCache.write(rid, remoteBundle);
        return remoteBundle;
    }
}