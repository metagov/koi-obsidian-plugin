
import { webcrypto } from 'crypto';
// TODO: replace with non node implementation

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
        const keyPair = await webcrypto.subtle.generateKey({
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

        const pubKey = await webcrypto.subtle.importKey(
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
        const privKey = await webcrypto.subtle.importKey(
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
        return await webcrypto.subtle.exportKey("jwk", this.privKey);
    }

    async sign(message: Uint8Array): Promise<string> {
        const signature = await webcrypto.subtle.sign({
            name: "ECDSA",
            hash: {name: "SHA-256"},
        }, this.privKey, message);

        return base64Encode(new Uint8Array(signature));
    }
}

export class PublicKey {
    private pubKey: CryptoKey;

    constructor(pubKey: CryptoKey) {
        this.pubKey = pubKey;
    }

    static async fromJwk(jwk: JsonWebKey): Promise<PublicKey> {
        const pubKey = await webcrypto.subtle.importKey(
            "jwk", 
            jwk, 
            {name: "ECDSA", namedCurve: "P-256"},
            true, 
            ["verify"]
        );
        return new PublicKey(pubKey);
    }

    static async fromDer(der: string): Promise<PublicKey> {
        const spki = base64Decode(der);
        const pubKey = await webcrypto.subtle.importKey(
            "spki",
            spki,
            { name: "ECDSA", namedCurve: "P-256" },
            true,
            ["verify"]
        );
        return new PublicKey(pubKey);
    }

    async toJwk(): Promise<JsonWebKey> {
        return await webcrypto.subtle.exportKey("jwk", this.pubKey);
    }

    async toDer(): Promise<string> {
        const spki = await webcrypto.subtle.exportKey("spki", this.pubKey);
        return base64Encode(new Uint8Array(spki));
    }

    async verify(signature: string, message: Uint8Array): Promise<boolean> {
        console.log(`message: ${message}`);
        const signatureBytes = base64Decode(signature);

        // signature (b64 string) -> decode

        console.log(signatureBytes);

        return await webcrypto.subtle.verify({
            name: "ECDSA",
            hash: {name: "SHA-256"},
        }, this.pubKey, signatureBytes, message);
    }
}

