export type TelescopeContents = {
    message_rid: string;
    team_id: string;
    team_name: string;
    channel_id: string;
    channel_name: string;
    timestamp: string;
    text: string;
    thread_timestamp: string | null;
    message_in_thread: boolean;
    created_at: string;
    edited_at: string | null;
    author_user_id: string | null;
    author_name: string | null;
    tagger_user_id: string;
    tagger_name: string | null;
    author_is_anonymous: boolean;
    emojis: Array<string>;
    comments: Array<string>;
    retract_time_started_at: string;
    permalink: string;
}