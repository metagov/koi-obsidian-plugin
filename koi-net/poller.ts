import { ProcessorInterface } from "./processor/interface";
import { NodeLifecycle } from "./lifecycle";
import { NetworkResolver } from "./network/resolver";
import { KoiNetConfigSchema } from "./config";

export class NodePoller {
    processor: ProcessorInterface;
    lifecycle: NodeLifecycle;
    resolver: NetworkResolver;
    config: KoiNetConfigSchema;

    constructor({processor, lifecycle, resolver, config}: {
        processor: ProcessorInterface;
        lifecycle: NodeLifecycle;
        resolver: NetworkResolver;
        config: KoiNetConfigSchema;
    }) {
        this.processor = processor;
        this.lifecycle = lifecycle;
        this.resolver = resolver;
        this.config = config;
    }

    async poll() {
        const neighbors = await this.resolver.pollNeighbors();
        for (const nodeRid in neighbors) {
            for (const event of neighbors[nodeRid]) {
                this.processor.handle({event: event, source: nodeRid});
            }
        }
        await this.processor.flushKobjQueue();
    }
}