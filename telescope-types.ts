import { z } from "zod";

export const TelescopeContentsSchema = z.object({
    message_rid: z.string(),
    team_id: z.string(),
    team_name: z.string(),
    channel_id: z.string(),
    channel_name: z.string(),
    timestamp: z.string(),
    text: z.string(),
    thread_timestamp: z.string().nullable(),
    message_in_thread: z.boolean(),
    created_at: z.string(),
    edited_at: z.string().nullable(),
    author_user_id: z.string().nullable(),
    author_name: z.string().nullable(),
    tagger_user_id: z.string(),
    tagger_name: z.string().nullable(),
    author_is_anonymous: z.boolean(),
    emojis: z.array(z.string()),
    comments: z.array(z.string()),
    retract_time_started_at: z.string(),
    permalink: z.string(),
});

export type TelescopeContents = z.infer<typeof TelescopeContentsSchema>;