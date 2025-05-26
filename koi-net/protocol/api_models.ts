import { z } from "zod";
import { BundleSchema } from "rid-lib/ext/bundle";
import { ManifestSchema } from "rid-lib/ext/manifest";
import { EventSchema } from "./event";


export const PollEventsReq = z.object({
    rid: z.string(),
    limit: z.number().default(0).nullable()
});

export const FetchRidsReq = z.object({
    rid_types: z.array(z.string()).default([])
});

export const FetchManifestsReq = z.object({
    rid_types: z.array(z.string()).default([]),
    rids: z.array(z.string()).default([])
});

export const FetchBundlesReq = z.object({
    rids: z.array(z.string()).default([])
});

export const RidsPayload = z.object({
    rids: z.array(z.string())
});

export const ManifestsPayload = z.object({
    manifests: z.array(ManifestSchema),
    not_found: z.array(z.string()).default([])
});

export const BundlesPayload = z.object({
    bundles: z.array(BundleSchema),
    not_found: z.array(z.string()).default([]),
    deferred: z.array(z.string()).default([])
});

export const EventsPayload = z.object({
    events: z.array(EventSchema)
});

export type PollEventsReq = z.infer<typeof PollEventsReq>;
export type FetchRidsReq = z.infer<typeof FetchRidsReq>;
export type FetchManifestsReq = z.infer<typeof FetchManifestsReq>;
export type FetchBundlesReq = z.infer<typeof FetchBundlesReq>;
export type RidsPayload = z.infer<typeof RidsPayload>;
export type ManifestsPayload = z.infer<typeof ManifestsPayload>;
export type BundlesPayload = z.infer<typeof BundlesPayload>;
export type EventsPayload = z.infer<typeof EventsPayload>;