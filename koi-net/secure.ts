import { Bundle } from "rid-lib/ext/bundle";
import { NodeIdentity } from "./identity";
import { Effector } from "./effector";
import { PrivateKey, PublicKey } from "./protocol/secure";
import { UnsignedEnvelope, SignedEnvelope } from "./protocol/envelope";
import { EventsPayload } from "./protocol/api_models";
import { EventType, Event } from "./protocol/event";
import { NodeProfileSchema } from "./protocol/node";
// import { UnknownNodeError, InvalidKeyError, InvalidSignatureError, InvalidTargetError } from "./protocol/errors"; // Uncomment if you have these
import { z } from "zod";
import { sha256Hash } from "rid-lib/ext/utils";
import { PrivKeySchema } from "./config";

export class Secure {
    identity: NodeIdentity;
    effector: Effector;
    privKey: PrivateKey;

    constructor({identity, effector}: {
        identity: NodeIdentity, 
        effector: Effector, 
    }) {
        this.identity = identity;
        this.effector = effector;
    }

    async loadPrivKey(jwk: PrivKeySchema): Promise<PrivateKey> {
        return await PrivateKey.fromJwk(jwk);
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

    async createEnvelope({ payload, target }: {
        payload: any, 
        target: string}
    ): Promise<SignedEnvelope> {
        const unsignedEnvelope = new UnsignedEnvelope({
            payload,
            source_node: this.identity.rid,
            target_node: target
        });
        return await unsignedEnvelope.signWith(this.privKey);
    }

    async validateEnvelope(envelope: SignedEnvelope) {
        const nodeBundle = (
            (await this.effector.deref({rid: envelope.source_node})) || 
            this.handleUnknownNode(envelope)
        );

        if (!nodeBundle) 
            throw new Error(`Couldn't resolve ${envelope.source_node}`); 

        const nodeProfile = nodeBundle.validateContents(NodeProfileSchema);

        const publicKeyHash = sha256Hash(nodeProfile.public_key);

        if (!envelope.source_node.endsWith(publicKeyHash)) {
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
}
