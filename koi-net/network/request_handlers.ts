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
            throw "don't talk to yourself";

        const nodeBundle = await this.effector.deref({ rid: node });

        let nodeUrl;
        if (nodeBundle) {
            const nodeProfile = nodeBundle.validateContents(NodeProfileSchema);
            if (nodeProfile.node_type !== NodeType.enum.FULL)
                throw "can't query partial node"
            nodeUrl = nodeProfile.base_url;
        } else if (node === this.config.first_contact.rid) {
            nodeUrl = this.config.first_contact.url;
        }

        if (!nodeUrl)
            throw "node not found";

        return nodeUrl;
    }

    async makeRequest({ node, req, path, throwOnFailure = false }: {
        node: string,
        path: string,
        req: EventsPayload | PollEventsReq | FetchRidsReq | FetchManifestsReq | FetchBundlesReq,
        throwOnFailure?: boolean
    }): Promise<PayloadUnion | undefined> {
        const url = (await this.getUrl(node)) + path;
        
        const signedEnvelope = await this.secure.createEnvelope({ 
            payload: req, 
            target: node 
        })

        console.log(url, req);
        // console.log(JSON.stringify(signedEnvelope));

        let result;
        try {
            result = await requestUrl({
                url, method: "POST",
                body: JSON.stringify(signedEnvelope),
                contentType: "application/json",
                throw: false
            });
        } catch(err) {
            console.log(err);
            if (throwOnFailure) throw err;
            return;
        }

        // console.log(result);

        if (result.status !== 200) {
            console.error(result.text);
            if (throwOnFailure)
                throw new Error(`Request to ${url} failed with status ${result.status}`);
            return ErrorResponse.parse(result.json);
        }

        if (path === BROADCAST_EVENTS_PATH)
            return;

        // console.log(result);

        const respEnvelope = SignedEnvelope.validate(result.json);
        try {
            await this.secure.validateEnvelope(respEnvelope);
        } catch (err) {
            console.error(`Rejected response from ${node}:`, err);
            return;
        }
        return respEnvelope.payload;
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
        return await this.makeRequest({
            node,
            path: POLL_EVENTS_PATH,
            req: PollEventsReq.parse(req)
        }) as EventsPayload;
    }

    async fetchRids({ node, req }: {
        node: string,
        req: Omit<FetchRidsReq, "type">
    }): Promise<RidsPayload> {
        return await this.makeRequest({
            node,
            path: FETCH_RIDS_PATH,
            req: FetchRidsReq.parse(req)
        }) as RidsPayload;
    }

    async fetchManifests({ node, req }: {
        node: string,
        req: any
    }): Promise<ManifestsPayload> {
        return await this.makeRequest({
            node,
            path: FETCH_MANIFESTS_PATH,
            req: FetchManifestsReq.parse(req)
        }) as ManifestsPayload;
    }

    async fetchBundles({ node, req }: {
        node: string,
        req: Omit<FetchBundlesReq, "type">
    }): Promise<BundlesPayload> {
        return await this.makeRequest({
            node,
            path: FETCH_BUNDLES_PATH,
            req: FetchBundlesReq.parse(req)
        }) as BundlesPayload;
    }
}