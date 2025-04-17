import { z } from "zod";

const ManifestSchema = z.object({
    rid: z.string(),
    timestamp: z.coerce.date(),
    sha256_hash: z.string()  
});

const BundleSchema = z.object({
    manifest: ManifestSchema,
    contents: z.record(z.any())
})