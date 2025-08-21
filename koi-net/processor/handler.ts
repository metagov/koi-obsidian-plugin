import { KnowledgeObject, StopChain } from "./knowledge_object";
import { EventType } from "koi-net/protocol/event";
import { HandlerContext } from "koi-net/context";

export enum HandlerType {
    RID = "rid",
    Manifest = "manifest",
    Bundle = "bundle",
    Network = "network",
    Final = "final"
}

type OptionalPromise<T> = T | Promise<T>;

export class KnowledgeHandler {
    public func: (ctx: HandlerContext, kobj: KnowledgeObject) => OptionalPromise<KnowledgeObject | StopChain | undefined>;
    public handlerType: HandlerType;
    public ridTypes?: Array<string>;
    public source?: string;
    public eventTypes?: Array<EventType | undefined>;

    constructor({
        func,
        handlerType,
        ridTypes,
        source,
        eventTypes,
    }: {
        func: (ctx: HandlerContext, kobj: KnowledgeObject) => OptionalPromise<KnowledgeObject | StopChain | undefined>;
        handlerType: HandlerType;
        ridTypes?: Array<string>;
        source?: string;
        eventTypes?: Array<EventType | undefined>;
    }) {
        this.func = func;
        this.handlerType = handlerType;
        this.ridTypes = ridTypes;
        this.source = source;
        this.eventTypes = eventTypes;
    }
}
