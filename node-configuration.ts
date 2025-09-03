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
            handlerType: HandlerType.RID,
            ridTypes: ["orn:obsidian.note"],
            func: (ctx: HandlerContext, kobj: KnowledgeObject) => {
                const {reference} = parseRidString(kobj.rid);

                if (kobj.source && reference?.startsWith(plugin.settings.vaultId!)) {
                    console.log("EVENT BOUNCING BACK FROM MANAGER");
                    return STOP_CHAIN;
                }
            }
        }),
        new KnowledgeHandler({
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
            handlerType: HandlerType.Network,
            ridTypes: ["orn:koi-net.node"],
            func: async (ctx: HandlerContext, kobj: KnowledgeObject) => {
                const nodeProfile = kobj.bundle!.validateContents(NodeProfileSchema);
                
                if (!nodeProfile.provides.event?.contains("orn:obsidian.note"))
                    return;

                if (kobj.rid === ctx.identity.rid)
                    return;

                if (nodeProfile.node_type !== NodeType.enum.FULL)
                    return;

                console.log("found obsidian manager!", kobj.rid);

                ctx.processor.handle({
                    bundle: generateEdgeBundle({
                        source: kobj.rid,
                        target: ctx.identity.rid,
                        edgeType: "POLL",
                        ridTypes: ["orn:obsidian.note"]
                    })
                });

                const payload = await ctx.requestHandler.fetchRids({
                    node: kobj.rid,
                    req: {rid_types: ["orn:obsidian.note"]}
                });
                for (const rid of payload.rids) {
                    if (rid === ctx.identity.rid) continue;
                    if (ctx.cache.exists(rid)) continue;
                    ctx.processor.handle({rid, source: kobj.rid});
                }

                for (const rid of plugin.indexer.listRids()) {
                    const bundle = await node.effector.deref({rid});
                    if (!bundle) continue;

                    console.log(`sending ${rid} to manager`);

                    ctx.eventQueue.pushEventTo({
                        event: KoiEvent.fromBundle(EventType.enum.NEW, bundle),
                        node: kobj.rid
                    })
                }
                await ctx.eventQueue.flushWebhookQueue(kobj.rid);
            }
        }),
        new KnowledgeHandler({
            handlerType: HandlerType.Network,
            ridTypes: ["orn:koi-net.node"],
            func: async (ctx: HandlerContext, kobj: KnowledgeObject) => {
                const nodeProfile = kobj.bundle!.validateContents(NodeProfileSchema);
                console.log("found telescope manager!", kobj.rid);
                
                if (!nodeProfile.provides.event?.contains("orn:telescoped"))
                    return;

                if (kobj.rid === ctx.identity.rid)
                    return;

                if (nodeProfile.node_type !== NodeType.enum.FULL)
                    return;

                ctx.processor.handle({
                    bundle: generateEdgeBundle({
                        source: kobj.rid,
                        target: ctx.identity.rid,
                        edgeType: "POLL",
                        ridTypes: ["orn:telescoped"]
                    })
                });

                const payload = await ctx.requestHandler.fetchRids({
                    node: kobj.rid,
                    req: {rid_types: ["orn:telescoped"]}
                });
                for (const rid of payload.rids) {
                    if (rid === ctx.identity.rid) continue;
                    if (ctx.cache.exists(rid)) continue;
                    ctx.processor.handle({rid, source: kobj.rid});
                }
            }
        })
    ]);
}