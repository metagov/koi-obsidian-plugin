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