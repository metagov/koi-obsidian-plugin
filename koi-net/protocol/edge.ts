import { Bundle } from "rid-lib/ext/bundle";
import { sha256Hash } from "rid-lib/ext/utils";
import { z } from "zod";


export const EdgeStatus = z.enum(["PROPOSED", "APPROVED"]);
export type EdgeStatus = z.infer<typeof EdgeStatus>;

export const EdgeType = z.enum(["WEBHOOK", "POLL"]);
export type EdgeType = z.infer<typeof EdgeType>;

export const EdgeProfileSchema = z.object({
    source: z.string(),
    target: z.string(),
    edge_type: EdgeType,
    status: EdgeStatus,
    rid_types: z.array(z.string())
});
export type EdgeProfileSchema = z.infer<typeof EdgeProfileSchema>;

export function generateEdgeBundle({source, target, ridTypes, edgeType}: {
    source: string,
    target: string,
    ridTypes: Array<string>,
    edgeType: EdgeType
}): Bundle {
    const edgeRid = sha256Hash(source + target);
    const edgeProfile: EdgeProfileSchema = {
        source, target, 
        rid_types: ridTypes, 
        edge_type: edgeType,
        status: "PROPOSED"
    }
    const edgeBundle = Bundle.generate({
        rid: edgeRid,
        contents: edgeProfile
    });
    return edgeBundle
}