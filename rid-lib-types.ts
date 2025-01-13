export type RidManifest = {
    rid: string;
    timestamp: string;
    sha256_hash: string;
}

export type RidEvent = {
    rid: string;
    event_type: string;
    manifest?: RidManifest;
}

export type RidBundle = {
    manifest: RidManifest;
    contents: Record<string, unknown>;
}