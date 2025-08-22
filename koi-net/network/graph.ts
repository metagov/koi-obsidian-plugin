import { DirectedGraph } from "graphology";
import { NodeIdentity } from "koi-net/identity";
import { EdgeProfileSchema, EdgeStatus } from "koi-net/protocol/edge";
import { KoiCache } from "rid-lib/ext/cache";


export class NetworkGraph {
    cache: KoiCache;
    identity: NodeIdentity;
    dg: DirectedGraph;
    
    constructor({ cache, identity }: { 
        cache: KoiCache; 
        identity: NodeIdentity 
    }) {
        this.cache = cache;
        this.identity = identity;
        this.dg = new DirectedGraph();
    }

    async generate() {
        console.log('Generating network graph');
        this.dg.clear();

        for (const rid of this.cache.listRids(["orn:koi-net.node"])) {
            this.dg.addNode(rid);
            console.log(`Added node ${rid}`);
        }

        for (const rid of this.cache.listRids(["orn:koi-net.edge"])) {
            const bundle = await this.cache.read(rid);
            if (!bundle) {
                console.error(`Failed to load ${rid}`)
                continue;
            }
            const edgeProfile = EdgeProfileSchema.parse(bundle.contents);
            
            this.dg.addEdge(edgeProfile.source, edgeProfile.target, { rid });
            console.log(`Added edge ${rid} (${edgeProfile.source} -> ${edgeProfile.target})`);
        }

        console.log('Done');
    }

    getEdge({source, target}: {
        source: string, 
        target: string
    }): string | undefined {
        if (this.dg.hasEdge(source, target)) {
            const edgeRid = this.dg.getEdgeAttribute(source, target, "rid");
            return edgeRid || undefined;
        }
        return;
    }

    getEdges(
        direction?: 'in' | 'out'
    ): Array<string> {
        const edges: Array<string> = [];

        if (direction !== 'in')
            edges.push(...this.dg.outEdges(this.identity.rid));

        if (direction !== 'out') 
            edges.push(...this.dg.inEdges(this.identity.rid));

        const edgeRids: Array<string> = [];
        for (const edge of edges) {
            const edgeRid = this.dg.getEdgeAttribute(edge, "rid");
            if (edgeRid) 
                edgeRids.push(edgeRid);
        }

        return edgeRids;
    }

    async getNeighbors({ direction, status, allowedType }: {
        direction?: 'in' | 'out',
        status?: EdgeStatus,
        allowedType?: string
    } = {}): Promise<Array<string>> {
        const neighbors: Array<string> = [];

        for (const edgeRid of this.getEdges(direction)) {
            const bundle = await this.cache.read(edgeRid);
            if (!bundle) {
                console.error(`Failed to find ${edgeRid} in cache`);
                continue;
            }
            const edgeProfile = EdgeProfileSchema.parse(bundle.contents);
            
            if (!edgeProfile) {
                console.warn(`Failed to find edge ${edgeRid} in cache`);
                continue;
            }

            if (status && edgeProfile.status !== status) continue;
            if (allowedType && !edgeProfile.rid_types.includes(allowedType)) continue;

            if (edgeProfile.target === this.identity.rid) {
                neighbors.push(edgeProfile.source);
            } else if (edgeProfile.source === this.identity.rid) {
                neighbors.push(edgeProfile.target);
            }
        }

        return neighbors;
    }
}