import { z } from "zod";
import { v4 as uuidv4 } from "uuid";


export const NodeType = z.enum(["FULL", "PARTIAL"]);

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

export function createNodeRid(name: string) {
    return `orn:koi-net.node:${name}+${uuidv4()}`;
}