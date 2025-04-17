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


export function sha256HashJson(contents: Record<string, unknown>): string {
    const contents_string = JSON.stringify(sortJson(contents));
    const hash = createHash("sha256");
    hash.update(contents_string);
    return hash.digest("hex");
}