import { Manifest } from "./manifest";
import { sha256HashJson } from "./utils";
import { z } from "zod";


export class Bundle {
    constructor(
        public manifest: Manifest,
        public contents: Record<string, unknown>
    ) {}

    static schema = z.object({
        manifest: Manifest.schema,
        contents: z.record(z.unknown())
    });

    static validate(obj: unknown): Bundle {
        const bundleObj = this.schema.parse(obj);
        return new Bundle(
            bundleObj.manifest,
            bundleObj.contents
        )
    }

    get rid(): string {
        return this.manifest.rid;
    }

    static generate({rid, contents}: {
        rid: string, 
        contents: Record<string, unknown>
    }): Bundle {
        return new Bundle(
            new Manifest(
                rid,
                new Date(),
                sha256HashJson(contents)
            ), 
            contents
        );
    }
}