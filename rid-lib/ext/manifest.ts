import { z } from "zod";

export class Manifest {
    constructor(
        public rid: string,
        public timestamp: string,
        public sha256_hash: string
    ) {}

    static schema = z.object({
        rid: z.string(),
        timestamp: z.string().datetime(),
        sha256_hash: z.string()  
    });

    static validate(obj: any): Manifest {
        const manifestObj = Manifest.schema.parse(obj);
        return new Manifest(
            manifestObj.rid,
            manifestObj.timestamp,
            manifestObj.sha256_hash
        );
    }
}