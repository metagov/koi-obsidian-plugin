

import { z } from 'zod';
import { PrivateKey, PublicKey } from './secure';
import { EventsPayload, PayloadUnion } from './api_models';
import { KoiEvent } from './event';


export class SignedEnvelope {
    payload: PayloadUnion;
    source_node: string;
    target_node: string;
    signature: string;
    // unsigned envelope serialized from the raw received object, so signature
    // verification isn't affected by zod reordering, stripping, or defaulting fields
    rawUnsignedJson?: string;

    constructor({payload, source_node, target_node, signature, rawUnsignedJson}: {
        payload: PayloadUnion,
        source_node: string,
        target_node: string,
        signature: string,
        rawUnsignedJson?: string
    }) {
        this.payload = payload;
        this.source_node = source_node;
        this.target_node = target_node;
        this.signature = signature;
        this.rawUnsignedJson = rawUnsignedJson;
    }

    static schema = z.object({
        payload: PayloadUnion,
        source_node: z.string(),
        target_node: z.string(),
        signature: z.string()
    });

    static validate(obj: any): SignedEnvelope {
        // console.log("VALIDATING ENV OBJ", obj);
        // for (const e of obj!.payload!.events) {
        //     console.log(KoiEvent.validate(e));
        // }
        // console.log(EventsPayload.parse(obj!.payload));
        const parsed = SignedEnvelope.schema.parse(obj);
        // console.log("SIGNED ENVELOPE", parsed);
        return new SignedEnvelope({
            payload: parsed.payload,
            source_node: parsed.source_node,
            target_node: parsed.target_node,
            signature: parsed.signature,
            rawUnsignedJson: JSON.stringify({
                payload: obj.payload,
                source_node: obj.source_node,
                target_node: obj.target_node
            })
        });
    }

    async verifyWith(pubKey: PublicKey): Promise<boolean> {
        const unsignedEnvelope = new UnsignedEnvelope({
            payload: this.payload,
            source_node: this.source_node,
            target_node: this.target_node
        });
        const data = new Uint8Array(
            this.rawUnsignedJson !== undefined
                ? Buffer.from(this.rawUnsignedJson)
                : unsignedEnvelope.toJsonBuffer()
        );

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
        // console.log("signing unsigned envelope...");
        const validatedEnvelope = UnsignedEnvelope.schema.parse({...this})
        // console.log(validatedEnvelope);
        const jsonEnvelope = JSON.stringify(validatedEnvelope);
        // console.log(jsonEnvelope);
        const data = new Uint8Array(Buffer.from(jsonEnvelope));
        // console.log(data);
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