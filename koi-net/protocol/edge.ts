import { z } from "zod";


export const EdgeStatus = z.enum(["PROPOSED", "APPROVED"]);
export type EdgeStatus = z.infer<typeof EdgeStatus>;

export const EdgeType = z.enum(["WEBHOOK", "POLL"]);
export type EdgeType = z.infer<typeof EdgeStatus>;

export type EdgeProfile = {
    source: string,
    target: string,
    edge_type: EdgeType,
    status: EdgeStatus,
    rid_types: Array<string>
}