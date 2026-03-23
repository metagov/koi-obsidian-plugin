import { NodeInterface } from "koi-net/core";
import { HandlerContext } from "koi-net/context";
import { HandlerType, KnowledgeHandler } from "koi-net/processor/handler";
import { KnowledgeObject, STOP_CHAIN } from "koi-net/processor/knowledge_object";
import { EdgeProfileSchema, EdgeStatus, generateEdgeBundle } from "koi-net/protocol/edge";
import { NodeProfileSchema, NodeType } from "koi-net/protocol/node";
import { parseRidString } from "rid-lib/utils";

import KoiPlugin from "main";
import { EventType, KoiEvent } from "koi-net/protocol/event";
import { KOI_NET_EDGE_TYPE, KOI_NET_NODE_TYPE, OBSIDIAN_NOTE_TYPE } from "consts";

export function configureNode(node: NodeInterface, plugin: KoiPlugin): void {
    node.pipeline.handlers.push(...[
        new KnowledgeHandler({
            name: "obsidian_event_mirroring_blocker",
            handlerType: HandlerType.RID,
            ridTypes: [OBSIDIAN_NOTE_TYPE],
            func: (ctx: HandlerContext, kobj: KnowledgeObject) => {
                const { reference } = parseRidString(kobj.rid);

                if (kobj.source && reference?.startsWith(plugin.settings.vaultId!)) {
                    console.log("EVENT BOUNCING BACK FROM MANAGER");
                    return STOP_CHAIN;
                }
            }
        }),
        new KnowledgeHandler({
            name: "file_formatter_mirror",
            handlerType: HandlerType.Network,
            func: async (ctx: HandlerContext, kobj: KnowledgeObject) => {
                console.log("NORMALIZED EVENT TYPE", kobj.normalizedEventType);
                if (kobj.normalizedEventType === "FORGET") {
                    await plugin.fileFormatter.delete(kobj.rid);
                } else {
                    await plugin.fileFormatter.write(kobj.rid);
                }
                await plugin.updateStatusBar();
            }
        }),
        new KnowledgeHandler({
            name: "interested_contactor",
            handlerType: HandlerType.Network,
            ridTypes: [KOI_NET_NODE_TYPE],
            func: async (ctx: HandlerContext, kobj: KnowledgeObject) => {
                if (kobj.rid === ctx.identity.rid) return;

                const nodeProfile = kobj.bundle!.validateContents(NodeProfileSchema);

                const availableRidTypes = nodeProfile.provides.event?.filter(
                    item => plugin.settings.interestedRidTypes.includes(item));

                if (!availableRidTypes || availableRidTypes.length === 0) return;
                if (nodeProfile.node_type !== NodeType.enum.FULL) return;
                
                // hardcoded delay to allow node profile to propagate before attempting edge negotiation with peers
                await new Promise(resolve => setTimeout(resolve, 1000));
                console.log(`identified ${kobj.rid} as provider of ${availableRidTypes}, proposing an edge`);

                ctx.processor.handle({
                    bundle: generateEdgeBundle({
                        source: kobj.rid,
                        target: ctx.identity.rid,
                        edgeType: "POLL",
                        ridTypes: availableRidTypes
                    })
                });
                
            }
        }),
        new KnowledgeHandler({
            name: "edge_approval_handler",
            handlerType: HandlerType.Bundle,
            ridTypes: [KOI_NET_EDGE_TYPE],
            eventTypes: [EventType.enum.NEW, EventType.enum.UPDATE],
            func: async (ctx: HandlerContext, kobj: KnowledgeObject) => {
                if (!kobj.source) return;
                const edgeProfile = kobj.bundle!.validateContents(EdgeProfileSchema);

                console.log(`Handling ${JSON.stringify(edgeProfile)}`);

                if (edgeProfile.target === ctx.identity.rid && 
                    edgeProfile.status === EdgeStatus.enum.APPROVED) {
                        

                        const payload = await ctx.requestHandler.fetchRids({
                            node: kobj.source,
                            req: { rid_types: edgeProfile.rid_types }
                        });
                        
                        console.log(`Retrieved ${payload.rids.length} RIDs from source node`)

                        payload.rids.forEach(
                            rid => {ctx.processor.handle({rid, source: kobj.source})});

                        // send existing obsidian notes if the 
                        console.log(`Identied obsidian manger, sending existing notes`);
                        if (edgeProfile.rid_types.contains(OBSIDIAN_NOTE_TYPE)) {
                            for (const rid of plugin.indexer.listRids()) {
                                const bundle = await node.effector.deref({ rid });
                                if (!bundle) continue;

                                console.log(`sending ${rid}`);

                                ctx.eventQueue.pushEventTo({
                                    event: KoiEvent.fromBundle(EventType.enum.NEW, bundle),
                                    node: kobj.source
                                })
                            }
                            await ctx.eventQueue.flushWebhookQueue(kobj.source);
                        }
                    }
            }
        }),
        new KnowledgeHandler({
            name: "obsidian_note_network_decider",
            handlerType: HandlerType.Network,
            ridTypes: [OBSIDIAN_NOTE_TYPE],
            func: (ctx: HandlerContext, kobj: KnowledgeObject) => {
                if (kobj.source) {
                    console.log("blocking broadcasting of externally sourced obsidian note");
                    return STOP_CHAIN;
                }
            }
        })
    ]);
}