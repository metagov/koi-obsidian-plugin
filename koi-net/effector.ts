import { KoiCache } from "rid-lib/ext/cache";
import { ProcessorInterface } from "./processor/interface";
import { Bundle } from "rid-lib/ext/bundle";


type EffectorAction = (rid: string) => Bundle | undefined;

export class Effector {
    cache: KoiCache;
    processor: ProcessorInterface;
    actionTable: Record<string, EffectorAction>;

    constructor({cache}: {
        cache: KoiCache,
        // processor: ProcessorInterface
    }) {
        this.cache = cache;
        // this.processor = processor;
    }

    registerAction(ridType: string, action: EffectorAction) {
        this.actionTable[ridType] = action;
    }

    async tryCache(rid: string): Promise<[Bundle, string] | undefined> {
        const bundle = await this.cache.read(rid);
        if (bundle)
            return [bundle, "cache"];
        else
            return
    }

    async tryAction(rid: string): Promise<[Bundle, string] | undefined> {
        let action;
        for (const ridType of Object.keys(this.actionTable)) {
            if (rid.startsWith(ridType)) {
                action = this.actionTable[ridType];
                break;
            }
        }
        if (!action) return;
        const bundle = action(rid);
        if (!bundle) return;
        return [bundle, "action"];
    }

    async tryNetwork(rid: string): Promise<[Bundle, string] | undefined> {
        return;
    }

    async deref({
        rid, 
        refreshCache = false, 
        useNetwork = false, 
        handleResult = false 
    }: {
        rid: string,
        refreshCache?: boolean,
        useNetwork?: boolean,
        handleResult?: boolean
    }): Promise<Bundle | undefined> {
        const [bundle, source] = (
            await this.tryCache(rid) ||
            await this.tryAction(rid) ||
            await this.tryNetwork(rid) ||
            [undefined, undefined]
        );

        if (handleResult && bundle && source !== "cache") {
            // this.processor.handle({
            //     bundle,
            //     source: source.startsWith("orn:koi-net.node") ? source : undefined
            // })
        }

        return bundle;
    }
}