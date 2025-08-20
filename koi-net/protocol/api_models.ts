import { z } from "zod";
import { Bundle } from "rid-lib/ext/bundle";
import { Manifest } from "rid-lib/ext/manifest";
import { Event } from "./event";


export const PollEventsReq = z.object({
    type: z.literal("poll_events"),
    rid: z.string(),
    limit: z.number().default(0).nullable()
});

export const FetchRidsReq = z.object({
    type: z.literal("fetch_rids"),
    rid_types: z.array(z.string()).default([])
});

export const FetchManifestsReq = z.object({
    type: z.literal("fetch_manifests"),
    rid_types: z.array(z.string()).default([]),
    rids: z.array(z.string()).default([])
});

export const FetchBundlesReq = z.object({
    type: z.literal("fetch_bundles"),
    rids: z.array(z.string()).default([])
});

export const RidsPayload = z.object({
    type: z.literal("rids_payload"),
    rids: z.array(z.string())
});

export const ManifestsPayload = z.object({
    type: z.literal("manifests_payload"),
    manifests: z.array(Manifest.schema).transform(m => m.map(Manifest.validate)),
    not_found: z.array(z.string()).default([])
});

export const BundlesPayload = z.object({
    type: z.literal("bundles_payload"),
    bundles: z.array(Bundle.schema).transform(b => b.map(Bundle.validate)),
    not_found: z.array(z.string()).default([]),
    deferred: z.array(z.string()).default([])
});

export const EventsPayload = z.object({
    type: z.literal("events_payload"),
    events: z.array(Event.schema).transform(e => e.map(Event.validate))
});

export const ErrorType = z.enum([
    "unknown_node",
    "invalid_key",
    "invalid_signature",
    "invalid_target"
])

export const ErrorResponse = z.object({
    type: z.literal("error_response"),
    error: ErrorType
})

export const PayloadUnion = z.discriminatedUnion("type", [
    PollEventsReq,
    FetchRidsReq,
    FetchManifestsReq,
    FetchBundlesReq,
    RidsPayload,
    ManifestsPayload,
    BundlesPayload,
    EventsPayload,
    ErrorResponse
])

export type PollEventsReq = z.infer<typeof PollEventsReq>;
export type FetchRidsReq = z.infer<typeof FetchRidsReq>;
export type FetchManifestsReq = z.infer<typeof FetchManifestsReq>;
export type FetchBundlesReq = z.infer<typeof FetchBundlesReq>;
export type RidsPayload = z.infer<typeof RidsPayload>;
export type ManifestsPayload = z.infer<typeof ManifestsPayload>;
export type BundlesPayload = z.infer<typeof BundlesPayload>;
export type EventsPayload = z.infer<typeof EventsPayload>;
export type ErrorResponse = z.infer<typeof ErrorResponse>;

export type PayloadUnion = z.infer<typeof PayloadUnion>;