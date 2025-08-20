import * as crypto from 'crypto';


export class PrivateKey {
    privKey: crypto.KeyObject
    
    constructor(privKey: crypto.KeyObject) {
        this.privKey = privKey;
    }

    static generate(): PrivateKey {
        const { privateKey: privKey } = crypto.generateKeyPairSync(
            'ec', {namedCurve: 'prime192v1'}
        );
        return new PrivateKey(privKey);
    }

    publicKey(): PublicKey {
        const pubKey = crypto.createPublicKey(this.privKey);
        return new PublicKey(pubKey);
    }

    static fromPem(priv_key_pem: string, password: string): PrivateKey {
        const privKey = crypto.createPrivateKey({
            key: priv_key_pem,
            type: 'pkcs8',
            format: 'pem',
            passphrase: password,
        });
        return new PrivateKey(privKey);
    }

    toPem(password: string): string {
        return this.privKey.export({
            type: 'pkcs8',
            format: 'pem',
            cipher: 'aes-256-cbc',
            passphrase: password,
        }).toString();
    }

    sign(message: Buffer): string {
        return crypto.sign(
            'sha256',
            message,
            this.privKey
        ).toString('base64url')
    }
}

export class PublicKey {
    pub_key: crypto.KeyObject
    
    constructor(pub_key: crypto.KeyObject) {
        this.pub_key = pub_key;
    }

    static fromPem(pub_key_pem: string): PublicKey {
        const pub_key = crypto.createPublicKey({
            key: pub_key_pem,
            format: 'pem',
        });
        return new PublicKey(pub_key);
    }

    toPem(): string {
        return this.pub_key.export({
            type: 'spki',
            format: 'pem',
        }).toString();
    }

    static fromDer(pub_key_der: string): PublicKey {
        const derBuffer = Buffer.from(pub_key_der, 'base64url');
        const pub_key = crypto.createPublicKey({
            key: derBuffer,
            format: 'der',
            type: 'spki',
        });
        return new PublicKey(pub_key);
    }

    toDer(): string {
        return this.pub_key.export({
            type: 'spki',
            format: 'der',
        }).toString('base64url');
    }

    verify(signature: string, message: Buffer): boolean {
        try {
            return crypto.verify(
                'sha256',
                message,
                this.pub_key,
                Buffer.from(signature, 'base64url')
            );
        } catch(err) {
            console.error(err);
            return false;
        }
    }
}

