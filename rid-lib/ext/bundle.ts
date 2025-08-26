import { Manifest } from "./manifest";
import { sha256HashJson } from "./utils";
import { z } from "zod";


function toSixDecimalISOString(date: Date): string {
    const isoString = date.toISOString();
    const parts = isoString.split('.');
    const timePart = parts[0];
    const millisecondPart = parts[1];
    const microseconds = millisecondPart.slice(0, 3) + '000';
    const newIsoString = `${timePart}.${microseconds}Z`;
    // console.log(isoString, newIsoString);
    return newIsoString;
}

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

    static schema = z.object({
        manifest: Manifest.schema.transform(m => Manifest.validate(m)),
        contents: z.record(z.unknown())
    });

    static validate(obj: unknown): Bundle {
        const bundleObj = Bundle.schema.parse(obj);
        return new Bundle({...bundleObj});
    }

    get rid(): string {
        return this.manifest.rid;
    }

    static generate({ rid, contents }: {
        rid: string,
        contents: Record<string, unknown>
    }): Bundle {
        console.log("generating bundle...");
        return new Bundle({
            manifest: new Manifest(
                rid,
                toSixDecimalISOString(new Date()),
                sha256HashJson(contents)
            ), contents
        });
    }

    validateContents<T>(schema: z.ZodType<T>): T {
        return schema.parse(this.contents);
    }
}