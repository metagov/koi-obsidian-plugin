import * as crypto from 'crypto';

// Cross-platform subtle helper
const getSubtle = () => {
    if (typeof window !== 'undefined' && window.crypto?.subtle) return window.crypto.subtle;
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require('crypto').webcrypto.subtle;
    } catch { }
    throw new Error('Web Crypto API not available');
};
// const subtle = getSubtle();

import { webcrypto } from 'crypto';
const subtle = webcrypto.subtle;

function base64Encode(input: Uint8Array): string {
    return Buffer.from(input).toString('base64');
}

function base64Decode(input: string): Uint8Array {
    return Buffer.from(input, 'base64');
}


export class PrivateKey {
    private privKey: CryptoKey;

    private constructor(privKey: CryptoKey) {
        this.privKey = privKey;
    }

    static async generate(): Promise<PrivateKey> {
        const keyPair = await subtle.generateKey({
            name: "ECDSA",
            namedCurve: "P-256",
        }, true, ["sign"]);
        return new PrivateKey(keyPair.privateKey);
    }

    async publicKey(): Promise<PublicKey> {
        const pubKeyJwk = await this.toJwk();
        // Remove private key parameters before creating a public key
        delete pubKeyJwk.d;
        pubKeyJwk.key_ops = ["verify"];
        const pubKey = await subtle.importKey(
            "jwk",
            pubKeyJwk, {
            name: "ECDSA",
            namedCurve: "P-256"
        },
            true, ["verify"]
        );
        return new PublicKey(pubKey);
    }

    static async fromJwk(jwk: JsonWebKey): Promise<PrivateKey> {
        const privKey = await subtle.importKey(
            "jwk",
            jwk, {
            name: "ECDSA",
            namedCurve: "P-256"
        },
            true, ["sign"]
        );
        return new PrivateKey(privKey);
    }

    async toJwk(): Promise<JsonWebKey> {
        return await subtle.exportKey("jwk", this.privKey);
    }

    async sign(message: string): Promise<string> {
        const encoder = new TextEncoder();
        const encodedMessage = encoder.encode(message);

        console.log(`message: ${message}, encoded: ${encodedMessage}`);

        const signature = await subtle.sign({
            name: "ECDSA",
            hash: {
                name: "SHA-256"
            },
        }, this.privKey, encodedMessage);

        return base64Encode(new Uint8Array(signature));
    }
}

export class PublicKey {
    private pubKey: CryptoKey;

    constructor(pubKey: CryptoKey) {
        this.pubKey = pubKey;
    }

    static async fromJwk(jwk: JsonWebKey): Promise<PublicKey> {
        const pubKey = await subtle.importKey(
            "jwk",
            jwk, {
            name: "ECDSA",
            namedCurve: "P-256"
        },
            true, ["verify"]
        );
        return new PublicKey(pubKey);
    }

    static async fromDer(der: string): Promise<PublicKey> {
        const spki = base64Decode(der);
        const pubKey = await subtle.importKey(
            "spki",
            spki,
            { name: "ECDSA", namedCurve: "P-256" },
            true,
            ["verify"]
        );
        return new PublicKey(pubKey);
    }

    async toJwk(): Promise<JsonWebKey> {
        return await subtle.exportKey("jwk", this.pubKey);
    }

    async toDer(): Promise<string> {
        const spki = await subtle.exportKey("spki", this.pubKey);
        return base64Encode(new Uint8Array(spki));
    }

    async verify(signature: string, message: string): Promise<boolean> {
        const encoder = new TextEncoder();
        const encodedMessage = encoder.encode(message);
        console.log(`message: ${message}, encoded: ${encodedMessage}`);
        const signatureBytes = base64Decode(signature);

        // signature (b64 string) -> decode

        console.log(signatureBytes);

        return await subtle.verify({
            name: "ECDSA",
            hash: {
                name: "SHA-256"
            },
        }, this.pubKey, signatureBytes, encodedMessage);
    }
}

