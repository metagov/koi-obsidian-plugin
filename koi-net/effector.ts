import { KoiCache } from "rid-lib/ext/cache";
import { ProcessorInterface } from "./processor/interface";
import { Bundle } from "rid-lib/ext/bundle";
import { ActionContext } from "./context";
import { NetworkResolver } from "./network/resolver";


export type EffectorAction = (ctx: ActionContext, rid: string) => Bundle | undefined;

export class Effector {
    cache: KoiCache;
    resolver: NetworkResolver;
    processor: ProcessorInterface;
    actionContext: ActionContext;
    actionTable: Record<string, EffectorAction>;

    constructor({cache}: {
        cache: KoiCache,
    }) {
        this.cache = cache;
        this.actionTable = {};
    }

    setProcessor(processor: ProcessorInterface) {
        this.processor = processor;
    }

    setResolver(resolver: NetworkResolver) {
        this.resolver = resolver;
    }

    setActionContext(actionContext: ActionContext) {
        this.actionContext = actionContext;
    }

    registerAction({ridType, action}: {
        ridType: string, 
        action: EffectorAction
    }) {
        this.actionTable[ridType] = action;
    }

    async tryCache(rid: string): Promise<[Bundle, string] | undefined> {
        console.log("try cache");
        const bundle = await this.cache.read(rid);
        if (bundle) {
            console.log("cache hit");
            return [bundle, "cache"];
        } else {
            return
        }
    }

    async tryAction(rid: string): Promise<[Bundle, string] | undefined> {
        console.log("try action");
        let action;
        for (const ridType of Object.keys(this.actionTable)) {
            if (rid.startsWith(ridType)) {
                console.log("found action")
                action = this.actionTable[ridType];
                break;
            }
        }
        if (!action) return;
        const bundle = action(this.actionContext, rid);
        if (!bundle) return;
        console.log("action hit");
        return [bundle, "action"];
    }

    async tryNetwork(rid: string): Promise<[Bundle, string] | undefined> {
        console.log("try network");
        return;
    }

    async deref({
        rid, 
        refreshCache = false, 
        useNetwork = false, 
        handleResult = true 
    }: {
        rid: string,
        refreshCache?: boolean,
        useNetwork?: boolean,
        handleResult?: boolean
    }): Promise<Bundle | undefined> {
        console.log("dereferencing", rid);

        const [bundle, source] = (
            (!refreshCache) && (await this.tryCache(rid)) ||
            (await this.tryAction(rid)) ||
            (useNetwork) && (await this.tryNetwork(rid)) ||
            [undefined, undefined]
        );

        if (!bundle) console.log("all miss");

        if (handleResult && bundle && source !== "cache") {
            this.processor.handle({
                bundle,
                source: source.startsWith("orn:koi-net.node") ? source : undefined
            });
        }

        return bundle;
    }
}