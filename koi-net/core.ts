import KoiPlugin from "main";
import { KoiCache } from "rid-lib/ext/cache";
import { NodeIdentity } from "./identity";
import { NetworkInterface } from "./network/interface";

export class NodeInterface {
    cache: KoiCache;
    plugin: KoiPlugin;
    identity: NodeIdentity;
    network: NetworkInterface;
    
    constructor({cache, plugin}: {
        cache: KoiCache,
        plugin: KoiPlugin
    }) {
        this.cache = cache;
        this.plugin = plugin;

        this.identity = new NodeIdentity({
            rid: this.plugin.settings.nodeRid,
            profile: {
                node_type: "PARTIAL",
                provides: {
                    event: ["orn:obsidian.note"],
                    state: []
                }
            }
        });

        console.log(this.plugin.settings);

        this.network = new NetworkInterface({
            cache: this.cache,
            identity: this.identity,
            settings: this.plugin.settings
        });

        // this.requestHandler = new RequestHandler({
        //     cache: this.cache, 
        //     settings: this.plugin.settings
        // })
    }

    async start(first_contact: string) {
        const ridsPayload = await this.network.requestHandler.fetchRids({
            url: first_contact,
            req: {
                rid_types: []
            }
        });

        const bundlesPayload = await this.network.requestHandler.fetchBundles({
            url: first_contact,
            req: {
                rids: ridsPayload.rids
            }
        });

        for (const bundle of bundlesPayload.bundles) {
            this.cache.write(bundle);
        }
    }

    stop() {
        
    }
}