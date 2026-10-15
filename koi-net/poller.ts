import { ProcessorInterface } from "./processor/interface";
import { NodeLifecycle } from "./lifecycle";
import { NetworkResolver } from "./network/resolver";
import { KoiNetConfigSchema } from "./config";
import { NetworkEventQueue } from "./network/event_queue";

export class NodePoller {
    processor: ProcessorInterface;
    lifecycle: NodeLifecycle;
    resolver: NetworkResolver;
    eventQueue: NetworkEventQueue;
    config: KoiNetConfigSchema;
    private polling = false;

    constructor({processor, lifecycle, resolver, eventQueue, config}: {
        processor: ProcessorInterface;
        lifecycle: NodeLifecycle;
        resolver: NetworkResolver;
        eventQueue: NetworkEventQueue;
        config: KoiNetConfigSchema;
    }) {
        this.processor = processor;
        this.lifecycle = lifecycle;
        this.resolver = resolver;
        this.eventQueue = eventQueue;
        this.config = config;
    }

    async poll() {
        // skip this tick if the previous poll is still running
        if (this.polling) return;
        this.polling = true;

        try {
            const neighbors = await this.resolver.pollNeighbors();
            for (const nodeRid in neighbors) {
                for (const event of neighbors[nodeRid]) {
                    this.processor.handle({event: event, source: nodeRid});
                }
            }
            await this.processor.flushKobjQueue();
        } finally {
            try {
                // retry any events that previously failed to send
                await this.eventQueue.flushAllWebhookQueues();
            } finally {
                this.polling = false;
            }
        }
    }
}