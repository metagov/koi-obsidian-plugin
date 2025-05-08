import KoiPlugin from "main";
import { Cache } from "rid-lib/ext/cache";
import { NodeIdentity } from "./identity";
import { RequestHandler } from "./network/request_handlers";

export class NodeInterface {
    cache: Cache;
    plugin: KoiPlugin;
    identity: NodeIdentity;
    requestHandler: RequestHandler;
    
    constructor({cache, plugin}: {
        cache: Cache,
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
        })

        this.requestHandler = new RequestHandler({
            cache, settings: this.plugin.settings
        })
    }
}