import { z } from "zod";


export const NodeType = z.enum(["FULL", "PARTIAL"]);
export type NodeType = z.infer<typeof NodeType>;

export const NodeProfileSchema = z.object({
    base_url: z.string().nullable().optional(),
    node_type: NodeType,
    provides: z.object({
        event: z.array(z.string()).default([]),
        state: z.array(z.string()).default([])
    }),
    public_key: z.string()
})

export type NodeProfileSchema = z.infer<typeof NodeProfileSchema>;