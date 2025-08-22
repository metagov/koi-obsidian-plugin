import { Event, EventType } from "koi-net/protocol/event";
import { HandlerType, KnowledgeHandler } from "./handler";
import { KnowledgeObject, STOP_CHAIN } from "./knowledge_object";
import { HandlerContext } from "koi-net/context";
import { NodeProfileSchema, NodeType } from "koi-net/protocol/node";
import { sha256Hash } from "rid-lib/ext/utils";
import { EdgeProfileSchema, EdgeStatus, EdgeType, generateEdgeBundle } from "koi-net/protocol/edge";
import { Bundle } from "rid-lib/ext/bundle";


export const basicRidHandler = new KnowledgeHandler({
    handlerType: HandlerType.RID,
    func: (ctx: HandlerContext, kobj: KnowledgeObject) => {

        console.log(kobj.rid);

        if (kobj.rid === ctx.identity.rid && kobj.source) 
            return STOP_CHAIN;

        if (kobj.eventType === EventType.enum.FORGET) {
            kobj.normalizedEventType = EventType.enum.FORGET;
            return kobj;
        }
    }
})

export const basicManifestHandler = new KnowledgeHandler({
    handlerType: HandlerType.Manifest,
    func: async (ctx: HandlerContext, kobj: KnowledgeObject) => {
        const prevBundle = await ctx.cache.read(kobj.rid);

        if (prevBundle) {
            if (kobj.manifest!.sha256_hash === prevBundle.manifest.sha256_hash) {
                console.log("Hash of incoming manifest is same as existing knowledge, ignoring");
                return STOP_CHAIN;
            }
            if (kobj.manifest!.timestamp <= prevBundle.manifest.timestamp) {
                console.log("Timestamp of incoming manifest is the same or older than existing knowledge, ignoring");
                return STOP_CHAIN;
            }

            console.log("RID previously known to me, labeling as 'UPDATE'")
            kobj.normalizedEventType = EventType.enum.UPDATE;
        } else {
            console.log("RID previously unknown to me, labeling as 'NEW'")
            kobj.normalizedEventType = EventType.enum.NEW;
        }

        return kobj;
    }
})

export const secureProfileHandler = new KnowledgeHandler({
    handlerType: HandlerType.Bundle,
    ridTypes: ["orn:koi-net.node"],
    eventTypes: [EventType.enum.NEW, EventType.enum.UPDATE],
    func: (ctx: HandlerContext, kobj: KnowledgeObject) => {
        const nodeProfile = kobj.bundle!.validateContents(NodeProfileSchema);
        if (!kobj.rid.endsWith(sha256Hash(nodeProfile.public_key))) {
            console.warn("public key mismatch for", kobj.rid);
            return STOP_CHAIN;
        }
    }
})

export const edgeNegotiationHandler = new KnowledgeHandler({
    handlerType: HandlerType.Bundle,
    ridTypes: ["orn:koi-net.edge"],
    eventTypes: [EventType.enum.NEW, EventType.enum.UPDATE],
    func: async (ctx: HandlerContext, kobj: KnowledgeObject) => {
        if (!kobj.source) return;
        const edgeProfile = kobj.bundle!.validateContents(EdgeProfileSchema);

        if (edgeProfile.source === ctx.identity.rid) {
            if (edgeProfile.status !== EdgeStatus.enum.PROPOSED) return;

            const peerRid = edgeProfile.target;
            const peerBundle = await ctx.effector.deref({rid: peerRid});

            if (!peerBundle) {
                console.warn("unknown peer", peerRid);
                return STOP_CHAIN;
            }

            const peerProfile = peerBundle.validateContents(NodeProfileSchema);

            const providedEvents = [
                "orn:koi-net.node",
                "orn:koi-net.edge",
                ...ctx.identity.profile.provides.event, 
            ];

            let abort: boolean = false;

            if (
                edgeProfile.edge_type === EdgeType.enum.WEBHOOK &&
                peerProfile.node_type === NodeType.enum.PARTIAL
            ) {
                abort = true;
            }
            

            if (
                edgeProfile.rid_types && 
                !edgeProfile.rid_types.every(
                    (rid: string) => 
                        providedEvents.includes(rid)
                )
            ) {
                console.warn("Requested RID types not provided by this node")
                abort = true;
            }

            if (abort) {
                const event = Event.fromRID("FORGET", kobj.rid);
                ctx.eventQueue.pushEventTo({event, node: kobj.rid, flush: true});
                return STOP_CHAIN;
                
            } else {
                edgeProfile.status = EdgeStatus.enum.APPROVED;
                const updatedBundle = Bundle.generate({
                    rid: kobj.rid,
                    contents: edgeProfile
                });
                ctx.handle({bundle: updatedBundle, eventType: "UPDATE"});
                return;
            }
        } else if (edgeProfile.target === ctx.identity.rid) {
            if (edgeProfile.status === EdgeStatus.enum.APPROVED) {
                console.log("edge approved by other node")
            }
        }
    }
})

export const coordinatorContact = new KnowledgeHandler({
    handlerType: HandlerType.Network,
    ridTypes: ["orn:koi-net.node"],
    func: async (ctx: HandlerContext, kobj: KnowledgeObject) => {
        const nodeProfile = kobj.bundle!.validateContents(NodeProfileSchema);

        if (!nodeProfile.provides.event?.contains("orn:koi-net.node"))
            return;

        if (kobj.rid === ctx.identity.rid)
            return;

        if (ctx.graph.getEdge({
            source: kobj.rid,
            target: ctx.identity.rid
        }))
            return;

        console.log("identified new coordinator, proposing edge");

        ctx.handle({
            bundle: generateEdgeBundle({
                source: kobj.rid,
                target: ctx.identity.rid,
                edgeType: "POLL",
                ridTypes: ["orn:koi-net.node"]
            })
        })

        const payload = await ctx.requestHandler.fetchRids({
            node: kobj.rid,
            req: {rid_types: ["orn:koi-net.node"]}
        });
        for (const rid of payload.rids) {
            if (rid === ctx.identity.rid) continue;
            if (ctx.cache.exists(rid)) continue;
            ctx.handle({rid, source: kobj.rid});
        }
    }
});

export const basicNetworkOutputFilter = new KnowledgeHandler({
    handlerType: HandlerType.Network,
    func: async (ctx: HandlerContext, kobj: KnowledgeObject) => {
        let involvesMe: boolean = false;
        if (!kobj.source) {
            if (kobj.rid.startsWith("orn:koi-net.node")) {
                if (kobj.rid === ctx.identity.rid) {
                    involvesMe = true;
                }
            } else if (kobj.rid.startsWith("orn:koi-net.edge")) {
                const edgeProfile = kobj.bundle!.validateContents(EdgeProfileSchema);
                if (edgeProfile.source === ctx.identity.rid) {
                    kobj.networkTargets.push(edgeProfile.target);
                    involvesMe = true;
                } else if (edgeProfile.target === ctx.identity.rid) {
                    kobj.networkTargets.push(edgeProfile.source);
                    involvesMe = true;
                }
            }
        }


        const ridType = kobj.rid.split(":", 1)[0];
        if (ctx.identity.profile.provides.event.contains(ridType) || involvesMe) {
            const subscribers = await ctx.graph.getNeighbors({
                direction: "out",
                allowedType: ridType
            });
            kobj.networkTargets.push(...subscribers);
        }

        return kobj;
    }
})

export const forgetEdgeOnNodeDeletion = new KnowledgeHandler({
    handlerType: HandlerType.Final,
    ridTypes: ["orn:koi-net.node"],
    func: async (ctx: HandlerContext, kobj: KnowledgeObject) => {
        if (kobj.normalizedEventType !== EventType.enum.FORGET) return;

        for (const edgeRid of ctx.graph.getEdges()) {
            const edgeBundle = await ctx.cache.read(edgeRid);
            const edgeProfile = edgeBundle?.validateContents(EdgeProfileSchema);
            if (!edgeProfile) continue;

            if (edgeProfile.source === kobj.rid || edgeProfile.target === kobj.rid) {
                ctx.handle({rid: edgeRid, eventType: EventType.enum.FORGET});
            }
        }
    }
})