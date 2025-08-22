import { KoiCache } from "rid-lib/ext/cache";
import { NodeIdentity } from "./identity";
import { NetworkResolver } from "./network/resolver";
import { ProcessorInterface } from "./processor/interface";
import { basicRidHandler } from "./processor/default_handlers";
import { RequestHandler } from "./network/request_handlers";
import { PrivateKey, PublicKey } from "./protocol/secure";
import { Effector } from "./effector";
import { NetworkGraph } from "./network/graph";
import { Secure } from "./secure";
import { KoiNetConfigSchema } from "./config";


export class NodeInterface {
    config: KoiNetConfigSchema
    cache: KoiCache;
    identity: NodeIdentity;
    effector: Effector;
    secure: Secure;
    requestHandler: RequestHandler;
    network: NetworkResolver;
    processor: ProcessorInterface;
    graph: NetworkGraph;
    privKey: PrivateKey;
    pubKey: PublicKey;
    
    constructor({cache, config}: {
        cache: KoiCache;
        config: KoiNetConfigSchema;
    }) {
        this.cache = cache;
        this.config = config;
    }

    async setup() {
        this.identity = new NodeIdentity(this.config);
        this.effector = new Effector({...this});
        this.secure = new Secure({...this});
        this.graph = new NetworkGraph({...this});
        this.requestHandler = new RequestHandler({...this})

        // this.network = new NetworkInterface({
        //     cache: this.cache,
        //     identity: this.identity,
        //     settings: this.plugin.settings
        // });

        // this.processor = new ProcessorInterface({
        //     cache: this.cache,
        //     network: this.network,
        //     identity: this.identity
        // })

        // this.processor.addHandler(basicRidHandler);
    }

    // async start() {
    //     this.network.graph.generate();

    //     this.processor.handle({
    //         bundle: Bundle.generate({
    //             rid: this.plugin.settings.nodeRid,
    //             contents: this.identity.profile
    //         })
    //     });

    //     await this.processor.flushKobjQueue();

    //     return;


    //     const ridsPayload = await this.network.requestHandler.fetchRids({
    //         url: this.plugin.settings.firstContact,
    //         req: {
    //             rid_types: ["orn:koi-net.node"]
    //         }
    //     });

    //     const bundlesPayload = await this.network.requestHandler.fetchBundles({
    //         url: this.plugin.settings.firstContact,
    //         req: {
    //             rids: ridsPayload.rids
    //         }
    //     });

    //     for (const bundle of bundlesPayload.bundles) {
    //         await this.processor.handle({bundle});
    //     }
    // }

    // async handshake() {
    //     const events = [
    //         Event.fromRID(
    //             EventType.enum.FORGET, this.identity.rid),
    //         Event.fromBundle(
    //             EventType.enum.NEW, await this.identity.bundle()),
    //     ];

    //     await this.network.requestHandler.broadcastEvents({
    //         url: this.plugin.settings.firstContact,
    //         req: { events }
    //     });
    // }

    // stop() {
        
    // }
}