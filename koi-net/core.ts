import KoiPlugin from "main";
import { KoiCache } from "rid-lib/ext/cache";
import { NodeIdentity } from "./identity";
import { NetworkInterface } from "./network/interface";
import { Bundle } from "rid-lib/ext/bundle";
import { Event, EventType } from "./protocol/event";
import { ProcessorInterface } from "./processor/interface";
import { basicRidHandler } from "./processor/default_handlers";
import { RequestHandler } from "./network/request_handlers";
import { PrivateKey, PublicKey } from "./protocol/secure";
import { createHash } from "crypto";
// import { Secure } from "./secure";
import { Effector } from "./effector";
import { NetworkGraph } from "./network/graph";
import { Secure } from "./secure";


export class NodeInterface {
    cache: KoiCache;
    plugin: KoiPlugin;
    identity: NodeIdentity;
    effector: Effector;
    secure: Secure;
    requestHandler: RequestHandler;
    network: NetworkInterface;
    processor: ProcessorInterface;
    graph: NetworkGraph;
    privKey: PrivateKey;
    pubKey: PublicKey;
    
    constructor({plugin}: {
        plugin: KoiPlugin
    }) {
        this.plugin = plugin;

        this.cache = new KoiCache({
            vault: this.plugin.app.vault, 
            directoryPath: "_ridcache"
        });
    
    }

    async setup() {
        this.privKey = await PrivateKey.generate();
        
//         fromPem(
//             `-----BEGIN ENCRYPTED PRIVATE KEY-----
// MIHcMFcGCSqGSIb3DQEFDTBKMCkGCSqGSIb3DQEFDDAcBAhc+39J9flZ5wICCAAw
// DAYIKoZIhvcNAgkFADAdBglghkgBZQMEASoEEF+JAkE6w8V9mocjPQMkXdQEgYDp
// 0j6dQ/L69erXOV+1M0wSfCjKmPgaVp1+dwfxFrbQqoH6jxjVcPQuGyn4s/A5QqLk
// PwrUudjUtU5l2wQNzR+hNij8FBYSDHC0py5o6X72jGNjAfdy40Sbqz68LEMwHExz
// WbmNGH4YKLfitB0SgGwXnW97lWcXGtkOR6ZiJztiRA==
// -----END ENCRYPTED PRIVATE KEY-----`, "koi-net"
//         );

        this.pubKey = await this.privKey.publicKey();

        const pubKeyHash = createHash('sha256').update(await this.pubKey.toDer()).digest('hex');

        this.identity = new NodeIdentity({
            rid: `orn:koi-net.node:obsidian+${pubKeyHash}`,
            profile: {
                node_type: "PARTIAL",
                provides: {
                    event: ["orn:obsidian.note"],
                    state: []
                },
                public_key: await this.pubKey.toDer()
            },
            cache: this.cache
        });

        this.effector = new Effector({cache: this.cache});

        this.secure = new Secure(this.identity, this.effector, null);

        this.graph = new NetworkGraph(this.cache, this.identity);

        this.requestHandler = new RequestHandler({
            cache: this.cache,
            graph: this.graph,
            identity: this.identity,
            secure: this.secure,
            effector: this.effector
        })

        console.log(this.plugin.settings);

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