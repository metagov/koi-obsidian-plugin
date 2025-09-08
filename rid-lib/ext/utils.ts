import serialize from "canonicalize";
import { createHash } from "crypto";

function sortJson(obj: any): any {
    if (typeof obj !== "object" || obj === null)
        return obj;

    let sortedKeys = Object.keys(obj).sort()
    let sortedObj: Record<string, unknown> = {};
    sortedKeys.forEach(
        (key) => {
            sortedObj[key] = sortJson(obj[key]);
        }
    )
    return sortedObj;
}

export function sha256Hash(input: string) {
    const hash = createHash('sha256');
    hash.update(input)
    return hash.digest('hex');
}


export function sha256HashJson(contents: Record<string, unknown>): string {
    const contents_string = serialize(contents);
    if (!contents_string)
        throw "failed to serialize JSON";
    return sha256Hash(contents_string);
}