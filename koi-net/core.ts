import KoiPlugin from "main";
import { KoiCache } from "rid-lib/ext/cache";
import { NodeIdentity } from "./identity";
import { NetworkInterface } from "./network/interface";
import { Bundle } from "rid-lib/ext/bundle";
import { Manifest } from "rid-lib/ext/manifest";
import { NodeProfileSchema } from "./protocol/node";
import { Event, EventType } from "./protocol/event";
import { EventsPayload, PollEventsReq } from "./protocol/api_models";

export class NodeInterface {
    cache: KoiCache;
    plugin: KoiPlugin;
    identity: NodeIdentity;
    network: NetworkInterface;
    
    constructor({plugin}: {
        plugin: KoiPlugin
    }) {
        this.plugin = plugin;

        this.cache = new KoiCache({
            vault: this.plugin.app.vault, 
            directoryPath: "_ridcache"
        });

        this.identity = new NodeIdentity({
            rid: this.plugin.settings.nodeRid,
            profile: {
                node_type: "PARTIAL",
                provides: {
                    event: ["orn:obsidian.note"],
                    state: []
                }
            },
            cache: this.cache
        });

        console.log(this.plugin.settings);

        this.network = new NetworkInterface({
            cache: this.cache,
            identity: this.identity,
            settings: this.plugin.settings
        });
    }

    async start() {
        const ridsPayload = await this.network.requestHandler.fetchRids({
            url: this.plugin.settings.firstContact,
            req: {
                rid_types: []
            }
        });

        const bundlesPayload = await this.network.requestHandler.fetchBundles({
            url: this.plugin.settings.firstContact,
            req: {
                rids: ridsPayload.rids
            }
        });

        for (const bundle of bundlesPayload.bundles) {
            this.cache.write(bundle);
        }

        this.cache.write(
            Bundle.generate({
                rid: this.plugin.settings.nodeRid,
                contents: this.identity.profile
            })
        );

        this.network.graph.generate();
    }

    async handshake() {
        const events = [
            Event.fromRID(
                EventType.enum.FORGET, this.identity.rid),
            Event.fromBundle(
                EventType.enum.NEW, await this.identity.bundle()),
        ];

        await this.network.requestHandler.broadcastEvents({
            url: this.plugin.settings.firstContact,
            req: { events }
        });
    }

    stop() {
        
    }
}