import { NodeProfileSchema } from "./protocol/node";


export class NodeIdentity {
    rid: string;
    profile: NodeProfileSchema;

    constructor({rid, profile}: {
        rid: string,
        profile: NodeProfileSchema,
    }) {
        this.rid = rid;
        this.profile = profile;
    }
}
