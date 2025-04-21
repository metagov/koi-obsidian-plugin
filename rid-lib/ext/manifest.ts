import { z } from "zod";

export const ManifestSchema = z.object({
    rid: z.string(),
    timestamp: z.coerce.date(),
    sha256_hash: z.string()  
}).transform(obj => new Manifest(obj));

export class Manifest {
    rid: string;
    timestamp: Date;
    sha256_hash: string;

    constructor({rid, timestamp, sha256_hash}: {
        rid: string,
        timestamp: Date,
        sha256_hash: string
    }) {
        this.rid = rid;
        this.timestamp = timestamp;
        this.sha256_hash = sha256_hash;
    }

    static validate(obj: Record<string, unknown>): Manifest {
        return ManifestSchema.parse(obj);
    }
}