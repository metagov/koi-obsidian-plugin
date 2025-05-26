import { z } from "zod";

export class Manifest {
    constructor(
        public rid: string,
        public timestamp: Date,
        public sha256_hash: string
    ) {}

    static schema = z.object({
        rid: z.string(),
        timestamp: z.coerce.date(),
        sha256_hash: z.string()  
    });

    static validate(obj: unknown): Manifest {
        const manifestObj = this.schema.parse(obj);
        return new Manifest(
            manifestObj.rid,
            manifestObj.timestamp,
            manifestObj.sha256_hash
        );
    }
}