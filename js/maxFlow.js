/**
 * ============================================================================
 * MAXFLOW.JS - Network Flow (Edmonds-Karp & Dinic's Algorithm) for Suggestions
 * ============================================================================
 * 
 * VIVA & THEORETICAL ANALYSIS:
 * ----------------------------
 * Q: How does Max Flow relate to Spell Check Suggestions?
 * A: When a sentence contains multiple misspelled words, candidate suggestions
 *    can COLLIDE or compete for the same dictionary word.
 *    For example:
 *      Error 1 ("recieve") -> Candidates: ["receive", "relieve"]
 *      Error 2 ("relive")  -> Candidates: ["relieve", "alive"]
 *    If Error 1 greedily takes "relieve", Error 2 might be left with a worse match
 *    or no valid match.
 *    We model this as a MAXIMUM BIPARTITE MATCHING / NETWORK FLOW problem:
 *      1. Source (S) connects to each Error Node (E_i) with capacity 1.
 *      2. Each Error Node (E_i) connects to candidate words (C_j) with capacity 1.
 *      3. Each Candidate Node (C_j) connects to Sink (T) with capacity 1.
 *    Solving for Maximum Flow guarantees the maximum number of errors are resolved
 *    with unique, non-colliding, globally optimal suggestions!
 * 
 * Q: What is Edmonds-Karp Algorithm?
 * A: It is an implementation of the Ford-Fulkerson method that uses BREADTH-FIRST SEARCH
 *    (BFS) to repeatedly find the shortest augmenting path (fewest edges) from S to T.
 *    - Time Complexity: O(V * E^2)
 *    - Guaranteed to terminate even on real-valued capacities.
 * 
 * Q: What is Dinic's Algorithm?
 * A: Dinic's improves upon Edmonds-Karp by working in PHASES:
 *    1. Step A (BFS): Builds a LEVEL GRAPH where each node's level is its shortest
 *       distance from Source S. Prunes backwards and lateral edges.
 *    2. Step B (DFS): Pushes multiple augmenting paths (called a BLOCKING FLOW)
 *       simultaneously through the level graph along admissible edges (level[v] == level[u] + 1)
 *       until no more paths exist in that level graph.
 *    - Time Complexity: O(V^2 * E) on general networks.
 *    - *CRITICAL VIVA POINT*: On unit networks (like Bipartite Matching where all
 *      internal capacities are 1), Dinic's runs in O(E * sqrt(V))—drastically
 *      faster than Edmonds-Karp!
 */

class FlowEdge {
    constructor(from, to, capacity, isSuggestionEdge = false) {
        this.from = from;
        this.to = to;
        this.capacity = capacity;
        this.flow = 0;
        this.residualEdge = null; // Pointer to opposite back-edge in residual graph
        this.isSuggestionEdge = isSuggestionEdge;
    }

    residualCapacity() {
        return this.capacity - this.flow;
    }
}

class FlowNetwork {
    constructor() {
        this.nodes = new Set();
        this.adjacencyList = new Map(); // node -> array of FlowEdge
    }

    addNode(node) {
        this.nodes.add(node);
        if (!this.adjacencyList.has(node)) {
            this.adjacencyList.set(node, []);
        }
    }

    addEdge(from, to, capacity, isSuggestionEdge = false) {
        this.addNode(from);
        this.addNode(to);

        // Forward edge: capacity = cap, flow = 0
        const forwardEdge = new FlowEdge(from, to, capacity, isSuggestionEdge);
        // Reverse residual back-edge: capacity = 0, flow = 0
        const backwardEdge = new FlowEdge(to, from, 0, false);

        forwardEdge.residualEdge = backwardEdge;
        backwardEdge.residualEdge = forwardEdge;

        this.adjacencyList.get(from).push(forwardEdge);
        this.adjacencyList.get(to).push(backwardEdge);

        return forwardEdge;
    }

    getEdges(node) {
        return this.adjacencyList.get(node) || [];
    }

    clone() {
        const net = new FlowNetwork();
        for (const u of this.nodes) {
            net.addNode(u);
        }
        for (const [u, edges] of this.adjacencyList.entries()) {
            for (const edge of edges) {
                if (edge.capacity > 0) { // forward edges only
                    net.addEdge(edge.from, edge.to, edge.capacity, edge.isSuggestionEdge);
                }
            }
        }
        return net;
    }
}

class MaxFlowEngine {
    /**
     * Constructs a bipartite matching flow network between detected errors
     * and their candidate dictionary suggestions.
     * 
     * @param {Array<{word: string, suggestions: Array<{word: string, distance: number}>}>} errorItems 
     * @returns {{network: FlowNetwork, source: string, sink: string, errorNodes: string[], suggestionNodes: string[]}}
     */
    static buildSuggestionNetwork(errorItems) {
        const network = new FlowNetwork();
        const source = "SOURCE (S)";
        const sink = "SINK (T)";

        network.addNode(source);
        network.addNode(sink);

        const errorNodes = [];
        const suggestionNodesSet = new Set();

        errorItems.forEach((item, index) => {
            const errorNode = `Error[${index + 1}]: "${item.word}"`;
            errorNodes.push(errorNode);

            // Connect Source -> Error (capacity 1)
            network.addEdge(source, errorNode, 1, false);

            // Connect Error -> Candidates (capacity 1)
            item.suggestions.forEach(cand => {
                const candNode = `Sugg: "${cand.word}"`;
                suggestionNodesSet.add(candNode);

                network.addEdge(errorNode, candNode, 1, true);
            });
        });

        const suggestionNodes = Array.from(suggestionNodesSet);

        // Connect Candidates -> Sink (capacity 1)
        suggestionNodes.forEach(candNode => {
            network.addEdge(candNode, sink, 1, false);
        });

        return { network, source, sink, errorNodes, suggestionNodes };
    }

    /**
     * Executes the Edmonds-Karp Max Flow algorithm with detailed path tracing.
     * Uses BFS to find the shortest augmenting path at each step.
     * Complexity: O(V * E^2)
     * 
     * @param {FlowNetwork} originalNetwork 
     * @param {string} source 
     * @param {string} sink 
     * @returns {Object} Execution trace with every path, bottleneck, residual changes
     */
    static runEdmondsKarp(originalNetwork, source, sink) {
        const network = originalNetwork.clone();
        let maxFlow = 0;
        const pathHistory = [];
        let iteration = 1;

        while (true) {
            // Step 1: BFS to find the shortest augmenting path in the residual graph
            const parentEdge = new Map();
            const visited = new Set([source]);
            const queue = [source];

            while (queue.length > 0) {
                const current = queue.shift();
                if (current === sink) break;

                for (const edge of network.getEdges(current)) {
                    if (!visited.has(edge.to) && edge.residualCapacity() > 0) {
                        visited.add(edge.to);
                        parentEdge.set(edge.to, edge);
                        queue.push(edge.to);
                    }
                }
            }

            // If sink was not reached, no augmenting path exists -> TERMINATE!
            if (!visited.has(sink)) {
                break;
            }

            // Step 2: Trace augmenting path and find bottleneck capacity
            let bottleneck = Infinity;
            let curr = sink;
            const pathNodes = [sink];
            const edgesInPath = [];

            while (curr !== source) {
                const edge = parentEdge.get(curr);
                edgesInPath.push(edge);
                bottleneck = Math.min(bottleneck, edge.residualCapacity());
                curr = edge.from;
                pathNodes.push(curr);
            }
            pathNodes.reverse();
            edgesInPath.reverse();

            // Step 3: Augment flow along the path
            for (const edge of edgesInPath) {
                edge.flow += bottleneck;
                edge.residualEdge.flow -= bottleneck;
            }

            maxFlow += bottleneck;

            // Record detailed path illustration
            pathHistory.push({
                iteration: iteration++,
                algorithm: "Edmonds-Karp (BFS Augmentation)",
                pathNodes: pathNodes,
                pathString: pathNodes.join("  ➜  "),
                bottleneckCapacity: bottleneck,
                cumulativeFlow: maxFlow,
                explanation: `BFS found shortest path with ${pathNodes.length - 1} hops: [${pathNodes.join(" → ")}]. Pushed bottleneck flow of ${bottleneck}.`
            });
        }

        // Collect final assignments (Error -> Suggestion where flow == 1)
        const assignments = [];
        for (const [node, edges] of network.adjacencyList.entries()) {
            for (const edge of edges) {
                if (edge.isSuggestionEdge && edge.flow > 0) {
                    assignments.push({
                        errorNode: edge.from,
                        suggestionNode: edge.to,
                        flow: edge.flow,
                        capacity: edge.capacity
                    });
                }
            }
        }

        return {
            algorithm: "Edmonds-Karp",
            timeComplexity: "O(V * E²)",
            maxFlow: maxFlow,
            pathHistory: pathHistory,
            assignments: assignments,
            network: network
        };
    }

    /**
     * Executes Dinic's Max Flow Algorithm with detailed Level Graph and Blocking Flow tracing.
     * Complexity: O(V^2 * E) on general graphs, O(E * sqrt(V)) on unit networks.
     * 
     * @param {FlowNetwork} originalNetwork 
     * @param {string} source 
     * @param {string} sink 
     * @returns {Object} Execution trace with level graphs, blocking flows, and paths
     */
    static runDinics(originalNetwork, source, sink) {
        const network = originalNetwork.clone();
        let maxFlow = 0;
        const phases = [];
        let phaseNumber = 1;

        // BFS to build level graph
        function bfsLevelGraph() {
            const levels = new Map();
            for (const node of network.nodes) {
                levels.set(node, -1);
            }
            levels.set(source, 0);

            const queue = [source];
            while (queue.length > 0) {
                const u = queue.shift();
                const currentLevel = levels.get(u);

                for (const edge of network.getEdges(u)) {
                    if (edge.residualCapacity() > 0 && levels.get(edge.to) === -1) {
                        levels.set(edge.to, currentLevel + 1);
                        queue.push(edge.to);
                    }
                }
            }

            return levels;
        }

        // DFS to push blocking flow
        function dfsBlockingFlow(u, pushed, levels, ptr, currentPath, blockingPaths) {
            if (pushed === 0 || u === sink) {
                return pushed;
            }

            const edges = network.getEdges(u);
            for (let cid = ptr.get(u); cid < edges.length; cid++) {
                ptr.set(u, cid);
                const edge = edges[cid];
                const tr = edge.to;

                // Admissible edge condition: level[to] == level[from] + 1 and residual capacity > 0
                if (levels.get(u) + 1 !== levels.get(tr) || edge.residualCapacity() === 0) {
                    continue;
                }

                currentPath.push(tr);
                const trPushed = dfsBlockingFlow(tr, Math.min(pushed, edge.residualCapacity()), levels, ptr, currentPath, blockingPaths);

                if (trPushed > 0) {
                    edge.flow += trPushed;
                    edge.residualEdge.flow -= trPushed;

                    blockingPaths.push({
                        pathString: [u, ...currentPath].join("  ➜  "),
                        pushedFlow: trPushed,
                        pathNodes: [u, ...currentPath]
                    });
                    return trPushed;
                }
                currentPath.pop();
            }

            return 0;
        }

        while (true) {
            // Step A: Build Level Graph via BFS
            const levels = bfsLevelGraph();

            // If sink cannot be reached, no more augmenting paths -> FINISH!
            if (levels.get(sink) === -1) {
                break;
            }

            // Organize nodes into visible layers for illustration
            const layerGrouping = {};
            for (const [node, lvl] of levels.entries()) {
                if (lvl !== -1) {
                    if (!layerGrouping[lvl]) layerGrouping[lvl] = [];
                    layerGrouping[lvl].push(node);
                }
            }

            // Pointer array for Dinic's optimization (skip dead-end edges)
            const ptr = new Map();
            for (const node of network.nodes) {
                ptr.set(node, 0);
            }

            const blockingPaths = [];
            let phaseFlow = 0;

            // Step B: Push blocking flows via DFS
            while (true) {
                const currentPath = [];
                const pushed = dfsBlockingFlow(source, Infinity, levels, ptr, currentPath, blockingPaths);
                if (pushed === 0) break;
                phaseFlow += pushed;
            }

            maxFlow += phaseFlow;

            phases.push({
                phase: phaseNumber++,
                levelGraphLayers: layerGrouping,
                sinkLevel: levels.get(sink),
                phaseFlow: phaseFlow,
                cumulativeFlow: maxFlow,
                blockingPaths: blockingPaths,
                explanation: `Phase ${phaseNumber - 1}: Constructed Level Graph with ${Object.keys(layerGrouping).length} layers. DFS found and saturated ${blockingPaths.length} blocking paths, pushing ${phaseFlow} units of flow.`
            });
        }

        // Collect final assignments
        const assignments = [];
        for (const [node, edges] of network.adjacencyList.entries()) {
            for (const edge of edges) {
                if (edge.isSuggestionEdge && edge.flow > 0) {
                    assignments.push({
                        errorNode: edge.from,
                        suggestionNode: edge.to,
                        flow: edge.flow,
                        capacity: edge.capacity
                    });
                }
            }
        }

        return {
            algorithm: "Dinic's Algorithm",
            timeComplexity: "O(V² * E) (General) / O(E * √V) (Bipartite)",
            maxFlow: maxFlow,
            phases: phases,
            assignments: assignments,
            network: network
        };
    }
}

// Export for global browser window
window.MaxFlowEngine = MaxFlowEngine;
window.FlowNetwork = FlowNetwork;
window.FlowEdge = FlowEdge;
