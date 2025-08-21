import { Bundle } from "rid-lib/ext/bundle";
import { NodeIdentity } from "./identity";
import { Effector } from "./effector";
// import { NodeConfig } from "./config"; // Uncomment if you have this
import { PrivateKey, PublicKey } from "./protocol/secure";
import { UnsignedEnvelope, SignedEnvelope } from "./protocol/envelope";
import { EventsPayload } from "./protocol/api_models";
import { EventType, Event } from "./protocol/event";
import { NodeProfileSchema } from "./protocol/node";
import { createHash } from "crypto";
// import { UnknownNodeError, InvalidKeyError, InvalidSignatureError, InvalidTargetError } from "./protocol/errors"; // Uncomment if you have these
import { z } from "zod";

export class Secure {
    identity: NodeIdentity;
    effector: Effector;
    // config: NodeConfig;
    privKey: PrivateKey;

    constructor(identity: NodeIdentity, effector: Effector, config: any /* NodeConfig */) {
        this.identity = identity;
        this.effector = effector;
        // this.config = config;
        // this.privKey = this._loadPrivKey(config);
    }

    private _loadPrivKey(config: any /* NodeConfig */) {
        // TODO
        // return awaitPrivateKey.fromPem("privKeyPem", config.env.priv_key_password);
    }

    private handleUnknownNode(envelope: SignedEnvelope): Bundle | undefined {
        if (envelope.payload.type !== "events_payload") 
            return undefined;
        
        const payload = envelope.payload as EventsPayload;
        for (const event of payload.events) {
            if (event.rid !== envelope.source_node) continue;
            if (event.event_type !== "NEW") continue;
            return event.bundle;
        }
        return undefined;
    }

    createEnvelope({ payload, target }: {
        payload: any, 
        target: string}
    ): SignedEnvelope {
        return new UnsignedEnvelope({
            payload,
            source_node: this.identity.rid,
            target_node: target
        }).signWith(this.privKey);
    }

    async validateEnvelope(envelope: SignedEnvelope) {
        const nodeBundle = (
            (await this.effector.deref({rid: envelope.source_node})) || 
            this.handleUnknownNode(envelope)
        );

        if (!nodeBundle) 
            throw new Error(`Couldn't resolve ${envelope.source_node}`); 

        const nodeProfile = nodeBundle.validateContents(NodeProfileSchema);


        const publicKeyHash = createHash('sha256').update(nodeProfile.public_key).digest('hex');

        if (envelope.source_node.endsWith(publicKeyHash)) {
            throw new Error("Invalid public key on new node!");
        }

        const pubKey = await PublicKey.fromDer(nodeProfile.public_key);
        if (!envelope.verifyWith(pubKey)) {
            throw new Error(`Signature ${envelope.signature} is invalid.`);
        }

        if (envelope.target_node !== this.identity.rid) {
            throw new Error(`Envelope target ${envelope.target_node} is not me`);
        }
    }

    // Instead of a decorator, use a wrapper function
    envelopeHandler<T extends (...args: any[]) => Promise<any>>(func: T) {
        return async (req: SignedEnvelope, ...args: Parameters<T>): Promise<SignedEnvelope | undefined> => {
            // Optionally add logging here
            this.validateEnvelope(req);
            const result = await func(req, ...args);
            if (result !== undefined && result !== null) {
                return this.createEnvelope({
                    payload: result, 
                    target: req.source_node
                });
            }
            return undefined;
        };
    }
}
