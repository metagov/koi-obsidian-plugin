import { NodeInterface } from "koi-net/core";
import { HandlerContext } from "koi-net/context";
import { HandlerType, KnowledgeHandler } from "koi-net/processor/handler";
import { KnowledgeObject, STOP_CHAIN } from "koi-net/processor/knowledge_object";
import { generateEdgeBundle } from "koi-net/protocol/edge";
import { NodeProfileSchema, NodeType } from "koi-net/protocol/node";
import { parseRidString } from "rid-lib/utils";

import KoiPlugin from "main";
import { EventType, KoiEvent } from "koi-net/protocol/event";

export function configureNode(node: NodeInterface, plugin: KoiPlugin): void {
    node.pipeline.handlers.push(...[
        new KnowledgeHandler({
            name: "obsidian_event_mirroring_blocker",
            handlerType: HandlerType.RID,
            ridTypes: ["orn:obsidian.note"],
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
            name: "telescope_contacter",
            handlerType: HandlerType.Network,
            ridTypes: ["orn:koi-net.node"],
            func: async (ctx: HandlerContext, kobj: KnowledgeObject) => {
                if (kobj.rid === ctx.identity.rid) return;

                const nodeProfile = kobj.bundle!.validateContents(NodeProfileSchema);

                const availableRidTypes = nodeProfile.provides.event?.filter(
                    item => plugin.settings.interestedRidTypes.includes(item));

                if (!availableRidTypes || availableRidTypes.length === 0) return;
                if (nodeProfile.node_type !== NodeType.enum.FULL) return;

                console.log(`identified ${kobj.rid} as provider of ${availableRidTypes}`);

                ctx.processor.handle({
                    bundle: generateEdgeBundle({
                        source: kobj.rid,
                        target: ctx.identity.rid,
                        edgeType: "POLL",
                        ridTypes: availableRidTypes
                    })
                });

                const payload = await ctx.requestHandler.fetchRids({
                    node: kobj.rid,
                    req: { rid_types: availableRidTypes }
                });
                
                console.log(`retrieved ${payload.rids.length} rids`)

                payload.rids.forEach(
                    rid => {ctx.processor.handle({rid, source: kobj.rid})});

                // send existing obsidian notes if the 
                console.log(`identied obsidian manger, sending existing notes`);
                if (availableRidTypes.contains('orn:obsidian.note')) {
                    for (const rid of plugin.indexer.listRids()) {
                        const bundle = await node.effector.deref({ rid });
                        if (!bundle) continue;

                        console.log(`sending ${rid}`);

                        ctx.eventQueue.pushEventTo({
                            event: KoiEvent.fromBundle(EventType.enum.NEW, bundle),
                            node: kobj.rid
                        })
                    }
                    await ctx.eventQueue.flushWebhookQueue(kobj.rid);
                }
            }
        })
    ]);
}