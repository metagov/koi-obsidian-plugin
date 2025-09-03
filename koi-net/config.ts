import { z } from "zod";
import { NodeProfileSchema } from "./protocol/node";


export const PrivKeySchema = z.object({
    key_ops: z.array(z.string()).optional(),
    ext: z.boolean().optional(),
    kty: z.string().optional(),
    x: z.string().optional(),
    y: z.string().optional(),
    crv: z.string().optional(),
    d: z.string().optional()
});

export const NodeContactSchema = z.object({
    rid: z.string().optional(),
    url: z.string().optional()
});

export const KoiNetConfigSchema = z.object({
    node_name: z.string(),
    node_rid: z.string(),
    node_profile: NodeProfileSchema,
    cache_directory_path: z.string(),
    polling_interval: z.number(),
    first_contact: NodeContactSchema,
    priv_key: PrivKeySchema.optional()
});

export type PrivKeySchema = z.infer<typeof PrivKeySchema>;
export type NodeContactSchema = z.infer<typeof NodeContactSchema>;
export type KoiNetConfigSchema = z.infer<typeof KoiNetConfigSchema>;