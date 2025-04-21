import { Manifest, ManifestSchema } from "./manifest";
import { sha256HashJson } from "./utils";
import { z } from "zod";


export const BundleSchema = z.object({
    manifest: ManifestSchema,
    contents: z.record(z.unknown())
}).transform(obj => new Bundle(obj));

export class Bundle {
    manifest: Manifest;
    contents: Record<string, unknown>;

    constructor({manifest, contents}: {
        manifest: Manifest,
        contents: Record<string, unknown>
    }) {
        this.manifest = manifest;
        this.contents = contents;
    }

    get rid(): string {
        return this.manifest.rid;
    }

    static generate({rid, contents}: {
        rid: string, 
        contents: Record<string, unknown>
    }): Bundle {
        return new Bundle({
            manifest: new Manifest({
                rid: rid,
                timestamp: new Date(),
                sha256_hash: sha256HashJson(contents)
            }), 
            contents: contents
        });
    }

    static validate(obj: Record<string, unknown>): Bundle {
        return BundleSchema.parse(obj);
    }
}