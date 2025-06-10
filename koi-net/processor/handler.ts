import { KnowledgeEventType, KnowledgeObject, KnowledgeSource, StopChain } from "./knowledge_object";
import { ProcessorInterface } from "./interface";

export enum HandlerType {
    RID = "rid",
    Manifest = "manifest",
    Bundle = "bundle",
    Network = "network",
    Final = "final"
}

type OptionalPromise<T> = T | Promise<T>;

export class KnowledgeHandler {
    public func: (p: ProcessorInterface, k: KnowledgeObject) => OptionalPromise<KnowledgeObject | StopChain | void>;
    public handlerType: HandlerType;
    public ridTypes: Array<string> | null;
    public source: KnowledgeSource | null;
    public eventTypes: Array<KnowledgeEventType> | null;

    constructor({
        func,
        handlerType,
        ridTypes = null,
        source = null,
        eventTypes = null,
    }: {
        func: (p: ProcessorInterface, k: KnowledgeObject) => OptionalPromise<KnowledgeObject | StopChain | void>;
        handlerType: HandlerType;
        ridTypes?: Array<string> | null;
        source?: KnowledgeSource | null;
        eventTypes?: Array<KnowledgeEventType> | null;
    }) {
        this.func = func;
        this.handlerType = handlerType;
        this.ridTypes = ridTypes;
        this.source = source;
        this.eventTypes = eventTypes;
    }
}
