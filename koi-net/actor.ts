import { Effector } from "./effector";
import { NodeIdentity } from "./identity";
import { NetworkEventQueue } from "./network/event_queue";
import { Event, EventType } from "./protocol/event";

export class Actor {
    identity: NodeIdentity;
    effector: Effector;
    eventQueue: NetworkEventQueue;

    constructor({identity, effector, eventQueue}: {
        identity: NodeIdentity;
        effector: Effector;
        eventQueue: NetworkEventQueue;
    }) {
        this.identity = identity;
        this.effector = effector;
        this.eventQueue = eventQueue;
    }

    async handshakeWith({target}: {target: string}) {
        this.eventQueue.pushEventTo({
            event: Event.fromRID(
                EventType.enum.FORGET, 
                this.identity.rid
            ),
            node: target
        });
        this.eventQueue.pushEventTo({
            event: Event.fromBundle(
                EventType.enum.NEW,
                (await this.effector.deref({rid: this.identity.rid}))!
            ),
            node: target
        });
        
        await this.eventQueue.flushWebhookQueue(target);
    }
}