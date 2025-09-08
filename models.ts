import { z } from "zod";

export const ObsidianNote = z.object({
    text: z.string(),
    frontmatter: z.any(),
    basename: z.string(),
    path: z.string()
})

export type ObsidianNote = z.infer<typeof ObsidianNote>;