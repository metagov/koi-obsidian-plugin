import { RidBundle, RidEvent, RidManifest } from 'rid-lib-types';

export const BROADCAST_EVENTS_PATH = "/events/broadcast";
export const POLL_EVENTS_PATH      = "/events/poll";
export const FETCH_RIDS_PATH       = "/rids/fetch";
export const FETCH_MANIFESTS_PATH  = "/manifests/fetch";
export const FETCH_BUNDLES_PATH    = "/bundles/fetch";

export type PollEventsReq = {
    rid: string;
    limit: number;
}

export type FetchRidsReq = {
    rid_types: Array<string>;
}

export type FetchManifestsReq = {
    rid_types: Array<string>;
    rids: Array<string>;
}

export type FetchBundlesReq = {
    rids: Array<string>;
}

export type RidsPayload = {
    rids: Array<string>;
}

export type ManifestsPayload = {
    manifests: Array<RidManifest>;
    not_found: Array<string>;
}

export type BundlesPayload = {
    bundles: Array<RidBundle>;
    not_found: Array<string>;
    deferred: Array<string>;
}

export type EventsPayload = {
    events: Array<RidEvent>;
}