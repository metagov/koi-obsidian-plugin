export class Manifest {
    rid: string;
    timestamp: Date;
    sha256_hash: string;

    constructor(
        rid: string,
        timestamp: Date,
        sha256_hash: string
    ) {
        this.rid = rid;
        this.timestamp = timestamp;
        this.sha256_hash = sha256_hash;
    }
}