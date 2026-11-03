import { KoiCache } from "rid-lib/ext/cache";
import {
    PollEventsReq,
    FetchBundlesReq,
    FetchManifestsReq,
    FetchRidsReq,
    EventsPayload,
    RidsPayload,
    ManifestsPayload,
    BundlesPayload,
    ErrorResponse,
    PayloadUnion
} from "koi-net/protocol/api_models";
import {
    BROADCAST_EVENTS_PATH,
    POLL_EVENTS_PATH,
    FETCH_BUNDLES_PATH,
    FETCH_MANIFESTS_PATH,
    FETCH_RIDS_PATH
} from "koi-net/protocol/consts";
import { requestUrl } from "obsidian";
import { NodeProfileSchema, NodeType } from "koi-net/protocol/node";
import { NetworkGraph } from "./graph";
import { NodeIdentity } from "koi-net/identity";
import { Effector } from "koi-net/effector";
import { Secure } from "koi-net/secure";
import { SignedEnvelope } from "koi-net/protocol/envelope";
import { KoiNetConfigSchema } from "koi-net/config";


export class RequestHandler {
    config: KoiNetConfigSchema;
    secure: Secure;
    identity: NodeIdentity;
    effector: Effector;
    cache: KoiCache;
    graph: NetworkGraph;

    constructor({ cache, graph, identity, effector, secure, config }: {
        identity: NodeIdentity;
        secure: Secure;
        effector: Effector;
        cache: KoiCache,
        graph: NetworkGraph,
        config: KoiNetConfigSchema
    }) {
        this.config = config;
        this.secure = secure;
        this.identity = identity;
        this.effector = effector;
        this.cache = cache;
        this.graph = graph;
    }

    async getUrl(node: string): Promise<string> {
        if (node === this.identity.rid)
            throw new Error("don't talk to yourself");

        const nodeBundle = await this.effector.deref({ rid: node });

        let nodeUrl;
        if (nodeBundle) {
            const nodeProfile = nodeBundle.validateContents(NodeProfileSchema);
            if (nodeProfile.node_type !== NodeType.enum.FULL)
                throw new Error(`can't query partial node ${node}`);
            nodeUrl = nodeProfile.base_url;
        } else if (node === this.config.first_contact.rid) {
            nodeUrl = this.config.first_contact.url;
        }

        if (!nodeUrl)
            throw new Error(`node not found: ${node}`);

        return nodeUrl;
    }

    // returns undefined on any failure (unknown node, network error, error
    // status, malformed or unverified response) unless throwOnFailure is set
    async makeRequest({ node, req, path, throwOnFailure = false }: {
        node: string,
        path: string,
        req: EventsPayload | PollEventsReq | FetchRidsReq | FetchManifestsReq | FetchBundlesReq,
        throwOnFailure?: boolean
    }): Promise<PayloadUnion | undefined> {
        try {
            return await this.sendRequest({ node, req, path });
        } catch (err) {
            console.error(`Request to ${node} (${path}) failed:`, err);
            if (throwOnFailure) throw err;
            return;
        }
    }

    private async sendRequest({ node, req, path }: {
        node: string,
        path: string,
        req: EventsPayload | PollEventsReq | FetchRidsReq | FetchManifestsReq | FetchBundlesReq
    }): Promise<PayloadUnion | undefined> {
        const url = (await this.getUrl(node)) + path;

        const signedEnvelope = await this.secure.createEnvelope({
            payload: req,
            target: node
        })

        console.log(url, req);

        const result = await requestUrl({
            url, method: "POST",
            body: JSON.stringify(signedEnvelope),
            contentType: "application/json",
            throw: false
        });

        if (result.status !== 200) {
            let detail = result.text;
            try {
                const errorResponse = ErrorResponse.safeParse(JSON.parse(result.text));
                if (errorResponse.success) detail = errorResponse.data.error;
            } catch {
                // non-JSON error body (e.g. a proxy's HTML error page)
            }
            throw new Error(`status ${result.status}: ${detail}`);
        }

        if (path === BROADCAST_EVENTS_PATH)
            return;

        const respEnvelope = SignedEnvelope.validate(JSON.parse(result.text));
        try {
            await this.secure.validateEnvelope(respEnvelope);
        } catch (err) {
            throw new Error(`Rejected response from ${node}: ${err}`);
        }
        return respEnvelope.payload;
    }

    // makes a request and only returns the payload if it's the expected type
    private async requestPayload<T extends PayloadUnion["type"]>({ node, path, req, expected }: {
        node: string,
        path: string,
        req: PollEventsReq | FetchRidsReq | FetchManifestsReq | FetchBundlesReq,
        expected: T
    }): Promise<Extract<PayloadUnion, { type: T }> | undefined> {
        const payload = await this.makeRequest({ node, path, req });
        if (!payload) return;
        if (payload.type !== expected) {
            console.warn(`Expected ${expected} from ${node}, got ${payload.type}`);
            return;
        }
        return payload as Extract<PayloadUnion, { type: T }>;
    }

    async broadcastEvents({ node, req }: {
        node: string,
        req: Omit<EventsPayload, "type">
    }): Promise<void> {
        // throws on failure so the event queue can requeue undelivered events
        await this.makeRequest({
            node,
            path: BROADCAST_EVENTS_PATH,
            req: EventsPayload.parse(req),
            throwOnFailure: true
        });
    }

    async pollEvents({ node, req }: {
        node: string,
        req: Omit<PollEventsReq, "type">
    }): Promise<EventsPayload | undefined> {
        return await this.requestPayload({
            node,
            path: POLL_EVENTS_PATH,
            req: PollEventsReq.parse(req),
            expected: "events_payload"
        });
    }

    async fetchRids({ node, req }: {
        node: string,
        req: Omit<FetchRidsReq, "type">
    }): Promise<RidsPayload | undefined> {
        return await this.requestPayload({
            node,
            path: FETCH_RIDS_PATH,
            req: FetchRidsReq.parse(req),
            expected: "rids_payload"
        });
    }

    async fetchManifests({ node, req }: {
        node: string,
        req: Partial<Omit<FetchManifestsReq, "type">>
    }): Promise<ManifestsPayload | undefined> {
        return await this.requestPayload({
            node,
            path: FETCH_MANIFESTS_PATH,
            req: FetchManifestsReq.parse(req),
            expected: "manifests_payload"
        });
    }

    async fetchBundles({ node, req }: {
        node: string,
        req: Omit<FetchBundlesReq, "type">
    }): Promise<BundlesPayload | undefined> {
        return await this.requestPayload({
            node,
            path: FETCH_BUNDLES_PATH,
            req: FetchBundlesReq.parse(req),
            expected: "bundles_payload"
        });
    }
}