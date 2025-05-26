import { DirectedGraph } from "graphology";
import { NodeIdentity } from "koi-net/identity";
import { NodeProfileSchema } from "koi-net/protocol/node";
import { EdgeProfileSchema, EdgeStatus } from "koi-net/protocol/edge";
import { KoiCache } from "rid-lib/ext/cache";



export class NetworkGraph {
    cache: KoiCache;
    identity: NodeIdentity;
    dg: DirectedGraph;

    constructor(cache: KoiCache, identity: NodeIdentity) {
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
            const edgeProfile = await this.getEdgeProfile(rid);

            if (!edgeProfile) {
                console.warn(`Failed to load ${rid}`);
                continue;
            }
            
            this.dg.addEdge(edgeProfile.source, edgeProfile.target, { rid });
            console.log(`Added edge ${rid} (${edgeProfile.source} -> ${edgeProfile.target})`);
        }

        console.log('Done');
    }

    async getNodeProfile(rid: string): Promise<NodeProfileSchema | null> {
        const bundle = await this.cache.read(rid);
        if (!bundle) return null;

        const nodeProfile = NodeProfileSchema.safeParse(bundle.contents);
        if (!nodeProfile.success) return null;
        
        return nodeProfile.data;
    }

    async getEdgeProfile({ rid, source, target }: {
        rid?: string,
        source?: string,
        target?: string
    }): Promise<EdgeProfileSchema | null> {
        if (source && target) {
            if (!this.dg.hasEdge(source, target)) return null;
            const edgeRid = this.dg.getEdgeAttribute(source, target, "rid");
            return edgeRid || null;
        }

        if (!rid) {
            throw new Error("Either 'rid' or 'source' and 'target' must be provided");
        }

        const bundle = await this.cache.read(rid);
        return bundle ? EdgeProfileSchema.parse(bundle.contents) : null;
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
    }): Promise<Array<string>> {
        const neighbors: Array<string> = [];

        for (const edgeRid of this.getEdges(direction)) {
            const edgeProfile = await this.getEdgeProfile({rid: edgeRid});
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