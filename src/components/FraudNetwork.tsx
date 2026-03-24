import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, Globe, Target } from "lucide-react";

interface GraphNode { id: string; x: number; y: number; fraud: boolean; mule: boolean; mule_score: number; community: number; }
interface GraphEdge { from: string; to: string; fraud: boolean; weight: number; }
interface Cluster { cluster_id: string; members: number; fraud_nodes: number; mule_nodes: number; risk: string; fraud_ratio: number; }
interface GraphData { nodes: GraphNode[]; edges: GraphEdge[]; clusters: Cluster[]; stats: { total_nodes: number; total_edges: number; fraud_nodes: number; mule_accounts: number; suspicious_clusters: number }; }

// Seeded pseudo-random for deterministic "normal" nodes
const seededRandom = (seed: number) => {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
};

const generateNormalNodes = (count: number): { nodes: GraphNode[]; edges: GraphEdge[] } => {
  const rand = seededRandom(42);
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  for (let i = 0; i < count; i++) {
    nodes.push({
      id: `NORM-${String(i + 1).padStart(4, "0")}`,
      x: 5 + rand() * 90,
      y: 5 + rand() * 90,
      fraud: false,
      mule: false,
      mule_score: 0,
      community: Math.floor(rand() * 8),
    });
  }
  // Generate random edges between normal nodes
  for (let i = 0; i < count * 1.5; i++) {
    const a = Math.floor(rand() * count);
    const b = Math.floor(rand() * count);
    if (a !== b) {
      edges.push({ from: nodes[a].id, to: nodes[b].id, fraud: false, weight: rand() * 0.5 });
    }
  }
  return { nodes, edges };
};

const FraudNetwork = () => {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [detected, setDetected] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"global" | "isolate">("global");

  const normalData = useMemo(() => generateNormalNodes(80), []);

  useEffect(() => {
    fetch("/api/graph").then((r) => r.json()).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleDetect = useCallback(() => {
    setDetected(false);
    setTimeout(() => setDetected(true), 1200);
  }, []);

  if (loading || !data) {
    return (
      <section className="py-24 md:py-32 border-t border-white/[0.04]">
        <div className="section-container flex justify-center items-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  // Merge data based on view mode
  const displayNodes = viewMode === "global" ? [...normalData.nodes, ...data.nodes] : data.nodes;
  const displayEdges = viewMode === "global" ? [...normalData.edges, ...data.edges] : data.edges;
  const allNodeMap = new Map(displayNodes.map(n => [n.id, n]));

  const totalNormal = viewMode === "global"
    ? normalData.nodes.length + (data.stats.total_nodes - data.stats.fraud_nodes - data.stats.mule_accounts)
    : data.stats.total_nodes - data.stats.fraud_nodes - data.stats.mule_accounts;

  return (
    <section className="py-24 md:py-32 border-t border-white/[0.04]">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Fraud Ring <span className="gradient-text">Network</span> Detection</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Graph analysis with PageRank + Louvain community detection identifies coordinated fraud rings and mule accounts.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="glass-card p-6">
          {/* Toggle + Legend + Button */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            {/* View mode toggle */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50 border border-white/[0.06]">
              <button
                onClick={() => setViewMode("global")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-300 ${
                  viewMode === "global"
                    ? "bg-primary/20 text-primary shadow-[0_0_10px_hsl(190,95%,55%,0.15)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Globe className="w-3.5 h-3.5" /> View Global Network
              </button>
              <button
                onClick={() => setViewMode("isolate")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-300 ${
                  viewMode === "isolate"
                    ? "bg-[hsl(0,72%,55%)]/20 text-[hsl(0,72%,55%)] shadow-[0_0_10px_hsl(0,72%,55%,0.15)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Target className="w-3.5 h-3.5" /> Isolate Fraud Rings
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary" /> Normal ({totalNormal})</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[hsl(0,72%,55%)]" /> Fraud ({data.stats.fraud_nodes})</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[hsl(38,92%,55%)]" /> Mule ({data.stats.mule_accounts})</span>
            </div>

            <button onClick={handleDetect} className="btn-primary text-xs px-4 py-2">
              <Search className="w-3.5 h-3.5" /> Detect Fraud Rings
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.svg
              key={viewMode}
              viewBox="0 0 100 100"
              className="w-full max-w-2xl mx-auto aspect-square"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5 }}
            >
              {displayEdges.map((e, i) => {
                const from = allNodeMap.get(e.from);
                const to = allNodeMap.get(e.to);
                if (!from || !to) return null;
                return (
                  <line key={`${viewMode}-e-${i}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke={detected && e.fraud ? "hsl(0,72%,55%)" : "hsl(222,30%,20%)"}
                    strokeWidth={detected && e.fraud ? 0.4 : 0.12}
                    opacity={detected && e.fraud ? 0.8 : 0.35}
                    className="transition-all duration-700" />
                );
              })}
              {displayNodes.map((n) => {
                const isFraud = detected && n.fraud;
                const isMule = detected && n.mule;
                const fill = isFraud ? "hsl(0,72%,55%)" : isMule ? "hsl(38,92%,55%)" : "hsl(190,95%,55%)";
                const r = hoveredNode === n.id ? 2.2 : isFraud || isMule ? 1.8 : viewMode === "global" && !n.fraud && !n.mule ? 0.8 : 1.2;
                return (
                  <g key={n.id}>
                    {(isFraud || isMule) && (<circle cx={n.x} cy={n.y} r={3} fill={fill} opacity={0.15} className="animate-pulse" />)}
                    <circle cx={n.x} cy={n.y} r={r} fill={fill} className="transition-all duration-500 cursor-pointer"
                      onMouseEnter={() => setHoveredNode(n.id)} onMouseLeave={() => setHoveredNode(null)}
                      style={{ filter: isFraud || isMule ? `drop-shadow(0 0 3px ${fill})` : undefined }} />
                    {hoveredNode === n.id && (
                      <text x={n.x} y={n.y - 3} textAnchor="middle" fill="hsl(210,40%,96%)" fontSize="2" fontFamily="monospace">{n.id}</text>
                    )}
                  </g>
                );
              })}
            </motion.svg>
          </AnimatePresence>

          {/* Cluster info */}
          {detected && data.clusters.length > 0 && (
            <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.clusters.slice(0, 3).map((c) => (
                <motion.div key={c.cluster_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-secondary/30 rounded-lg p-3 border border-white/[0.04]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono text-xs font-bold">{c.cluster_id}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${c.risk === "CRITICAL" ? "bg-destructive/20 text-destructive" : c.risk === "HIGH" ? "bg-[hsl(38,92%,55%)]/20 text-[hsl(38,92%,55%)]" : "bg-primary/20 text-primary"}`}>{c.risk}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {c.members} members · {c.fraud_nodes} fraud · {c.mule_nodes} mules · {(c.fraud_ratio * 100).toFixed(0)}% fraud
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default FraudNetwork;
