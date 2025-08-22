

import { z } from 'zod';
import { PrivateKey, PublicKey } from './secure';
import { PayloadUnion } from './api_models';
import { createHash } from 'crypto';


export class SignedEnvelope {
    payload: PayloadUnion;
    source_node: string;
    target_node: string;
    signature: string;

    constructor({payload, source_node, target_node, signature}: {
        payload: PayloadUnion,
        source_node: string,
        target_node: string,
        signature: string 
    }) {
        this.payload = payload;
        this.source_node = source_node;
        this.target_node = target_node;
        this.signature = signature;
    }

    static schema = z.object({
        payload: PayloadUnion,
        source_node: z.string(),
        target_node: z.string(),
        signature: z.string()
    });

    static validate(obj: unknown): SignedEnvelope {
        const parsed = SignedEnvelope.schema.parse(obj);
        return new SignedEnvelope({
            payload: parsed.payload,
            source_node: parsed.source_node,
            target_node: parsed.target_node,
            signature: parsed.signature
        });
    }

    async verifyWith(pubKey: PublicKey): Promise<boolean> {
        const unsignedEnvelope = new UnsignedEnvelope({
            payload: this.payload,
            source_node: this.source_node,
            target_node: this.target_node
        });
        const data = new Uint8Array(unsignedEnvelope.toJsonBuffer());

        return await pubKey.verify(this.signature, data);
    }
}

export class UnsignedEnvelope {
    payload: PayloadUnion;
    source_node: string;
    target_node: string;

    constructor({payload, source_node, target_node}: {
        payload: PayloadUnion,
        source_node: string,
        target_node: string
    }) {
        this.payload = payload;
        this.source_node = source_node;
        this.target_node = target_node;
    }

    static schema = z.object({
        payload: PayloadUnion,
        source_node: z.string(),
        target_node: z.string(),
    });

    static validate(obj: unknown): UnsignedEnvelope {
        const parsed = UnsignedEnvelope.schema.parse(obj);
        return new UnsignedEnvelope({
            payload: parsed.payload,
            source_node: parsed.source_node,
            target_node: parsed.target_node
        });
    }

    async signWith(privKey: PrivateKey): Promise<SignedEnvelope> {
        const data = new Uint8Array(this.toJsonBuffer());
        const signature = await privKey.sign(data);
        return new SignedEnvelope({
            payload: this.payload,
            source_node: this.source_node,
            target_node: this.target_node,
            signature
        });
    }

    toJsonBuffer(): Buffer {
        return Buffer.from(JSON.stringify({
            payload: this.payload,
            source_node: this.source_node,
            target_node: this.target_node
        }));
    }
}