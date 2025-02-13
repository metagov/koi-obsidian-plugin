import { KoiInterface } from "koi-interface";
import { RidCache } from "rid-cache";
import { RidBundle } from "rid-lib-types";

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
            // console.log("hit cache");
            return localBundle;
        }

        const remoteBundle = await this.koiInterface.getObject(rid);
        if (!remoteBundle) return null;

        // console.log("hit api");
        await this.ridCache.write(rid, remoteBundle);
        return remoteBundle;
    }
}