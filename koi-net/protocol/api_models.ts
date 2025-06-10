import { z } from "zod";
import { Bundle } from "rid-lib/ext/bundle";
import { Manifest } from "rid-lib/ext/manifest";
import { Event } from "./event";


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
    manifests: z.array(Manifest.schema).transform(m => m.map(Manifest.validate)),
    not_found: z.array(z.string()).default([])
});

export const BundlesPayload = z.object({
    bundles: z.array(Bundle.schema).transform(b => b.map(Bundle.validate)),
    not_found: z.array(z.string()).default([]),
    deferred: z.array(z.string()).default([])
});

export const EventsPayload = z.object({
    events: z.array(Event.schema).transform(e => e.map(Event.validate))
});

export type PollEventsReq = z.infer<typeof PollEventsReq>;
export type FetchRidsReq = z.infer<typeof FetchRidsReq>;
export type FetchManifestsReq = z.infer<typeof FetchManifestsReq>;
export type FetchBundlesReq = z.infer<typeof FetchBundlesReq>;
export type RidsPayload = z.infer<typeof RidsPayload>;
export type ManifestsPayload = z.infer<typeof ManifestsPayload>;
export type BundlesPayload = z.infer<typeof BundlesPayload>;
export type EventsPayload = z.infer<typeof EventsPayload>;