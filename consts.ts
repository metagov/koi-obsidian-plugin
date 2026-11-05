export const RID_FIELD = "_rid";
export const TIMESTAMP_FIELD = "_timestamp";
export const SHA256_HASH_FIELD = "_sha256_hash";
export const KOI_NET_ENABLED_FIELD = "_koi_net_enabled";

export const KOI_NET_NODE_TYPE = "orn:koi-net.node";
export const KOI_NET_EDGE_TYPE = "orn:koi-net.edge";
export const OBSIDIAN_NOTE_TYPE = "orn:obsidian.note";
export const TELESCOPED_TYPE = "orn:telescoped";
export const SLACK_USER_TYPE = "orn:slack.user";

// the RID cache always lives in this subdirectory of the sync folder
export const RID_CACHE_FOLDER_NAME = "RID Cache";

// sync folder subdirectory names for built-in RID types, other types fall
// back to a filename-safe version of the RID type
export const RID_TYPE_FOLDER_NAMES: Record<string, string> = {
    [KOI_NET_NODE_TYPE]: "KOI-net Nodes",
    [KOI_NET_EDGE_TYPE]: "KOI-net Edges",
    [OBSIDIAN_NOTE_TYPE]: "Obsidian Notes",
    [TELESCOPED_TYPE]: "Telescoped Messages",
    [SLACK_USER_TYPE]: "Slack Users",
};