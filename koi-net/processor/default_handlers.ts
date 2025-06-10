import { EventType } from "koi-net/protocol/event";
import { HandlerType, KnowledgeHandler } from "./handler";
import { ProcessorInterface } from "./interface";
import { KnowledgeObject, KnowledgeSource, STOP_CHAIN } from "./knowledge_object";


export const basicRidHandler = new KnowledgeHandler({
    handlerType: HandlerType.RID,
    func: (processor: ProcessorInterface, kobj: KnowledgeObject) => {

        console.log(kobj.rid);

        if (kobj.rid === processor.identity.rid &&
            kobj.source === KnowledgeSource.External
        ) return STOP_CHAIN;

        kobj.normalizedEventType = kobj.eventType;
        return kobj;

        // if (kobj.eventType === EventType.enum.FORGET) {
        //     kobj.normalizedEventType = EventType.enum.FORGET;
        //     return kobj;
        // }
    }
})

export const basicManifestHandler = new KnowledgeHandler({
    handlerType: HandlerType.Manifest,
    func: async (processor: ProcessorInterface, kobj: KnowledgeObject) => {
        const prevBundle = await processor.cache.read(kobj.rid);

        if (prevBundle) {
            if (kobj.manifest!.sha256_hash === prevBundle.manifest.sha256_hash) {
                console.log("Hash of incoming manifest is same as existing knowledge, ignoring");
                return STOP_CHAIN;
            }
            if (kobj.manifest!.timestamp <= prevBundle.manifest.timestamp) {
                console.log("Timestamp of incoming manifest is the same or older than existing knowledge, ignoring");
                return STOP_CHAIN;
            }

            kobj.normalizedEventType = EventType.enum.NEW;
        } else {
            kobj.normalizedEventType = EventType.enum.NEW;
        }

        return kobj;
    }
})