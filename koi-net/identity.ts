import { KoiNetConfigSchema } from "./config";
import { NodeProfileSchema } from "./protocol/node";


export class NodeIdentity {
    constructor(
        public config: KoiNetConfigSchema
    ) {}

    get rid(): string {
        return this.config.node_rid as string;
    }

    get profile(): NodeProfileSchema {
        return this.config.node_profile;
    }
}
