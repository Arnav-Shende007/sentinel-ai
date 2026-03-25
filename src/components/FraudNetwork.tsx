import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, Globe, Target, X, ArrowDownLeft, ArrowUpRight, Network, Fingerprint, BarChart3 } from "lucide-react";

interface GraphNode { id: string; x: number; y: number; fraud: boolean; mule: boolean; mule_score: number; community: number; }
interface GraphEdge { from: string; to: string; fraud: boolean; weight: number; }
interface Cluster { cluster_id: string; members: number; fraud_nodes: number; mule_nodes: number; risk: string; fraud_ratio: number; }
interface GraphData { nodes: GraphNode[]; edges: GraphEdge[]; clusters: Cluster[]; stats: { total_nodes: number; total_edges: number; fraud_nodes: number; mule_accounts: number; suspicious_clusters: number }; }

interface Peer { id: string; amount: number; is_fraud: boolean; is_mule: boolean; }
interface NodeDetail {
  node_id: string; mule_score: number; is_mule: boolean; is_fraud: boolean;
  pagerank: number; pagerank_zscore: number; in_degree: number; out_degree: number;
  community: number; in_cycle: boolean;
  total_money_in: number; total_money_out: number; total_funneled: number;
  incoming_peers: Peer[]; outgoing_peers: Peer[];
  cluster: Cluster | null;
}

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
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodeDetail, setNodeDetail] = useState<NodeDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const normalData = useMemo(() => generateNormalNodes(80), []);

  useEffect(() => {
    fetch("/api/graph").then((r) => r.json()).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleDetect = useCallback(() => {
    setDetected(false);
    setTimeout(() => setDetected(true), 1200);
  }, []);

  const handleNodeClick = useCallback(async (node: GraphNode) => {
    if (!detected) return;
    if (!node.fraud && !node.mule) return;

    // If clicking the same node, close the panel
    if (selectedNode === node.id) {
      setSelectedNode(null);
      setNodeDetail(null);
      return;
    }

    setSelectedNode(node.id);
    setLoadingDetail(true);
    setNodeDetail(null);

    try {
      const res = await fetch(`/api/graph/node/${encodeURIComponent(node.id)}`);
      if (res.ok) {
        const detail = await res.json();
        setNodeDetail(detail);
      }
    } catch {
      // silent
    } finally {
      setLoadingDetail(false);
    }
  }, [detected, selectedNode]);

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
    <section id="fraud-network" className="py-24 md:py-32 border-t border-white/[0.04]">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Fraud Ring <span className="gradient-text">Network</span> Detection</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Graph analysis with PageRank + Louvain community detection identifies coordinated fraud rings and mule accounts.
            {detected && <span className="block text-primary/60 text-xs mt-1">Click any red or orange node to inspect mule details.</span>}
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

          {/* Graph + Detail panel layout */}
          <div className="flex gap-4">
            {/* Graph SVG */}
            <div className={`transition-all duration-500 ${selectedNode ? "flex-1 min-w-0" : "w-full"}`}>
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
                    const isSelectedEdge = selectedNode && (e.from === selectedNode || e.to === selectedNode);
                    return (
                      <line key={`${viewMode}-e-${i}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                        stroke={isSelectedEdge ? "hsl(190,95%,55%)" : detected && e.fraud ? "hsl(0,72%,55%)" : "hsl(222,30%,20%)"}
                        strokeWidth={isSelectedEdge ? 0.5 : detected && e.fraud ? 0.4 : 0.12}
                        opacity={isSelectedEdge ? 1 : detected && e.fraud ? 0.8 : 0.35}
                        className="transition-all duration-700" />
                    );
                  })}
                  {displayNodes.map((n) => {
                    const isFraud = detected && n.fraud;
                    const isMule = detected && n.mule;
                    const isSelected = selectedNode === n.id;
                    const fill = isMule ? "hsl(38,92%,55%)" : isFraud ? "hsl(0,72%,55%)" : "hsl(190,95%,55%)";
                    const r = isSelected ? 2.8 : hoveredNode === n.id ? 2.2 : isFraud || isMule ? 1.8 : viewMode === "global" && !n.fraud && !n.mule ? 0.8 : 1.2;
                    const isClickable = detected && (n.fraud || n.mule);
                    return (
                      <g key={n.id}>
                        {/* Selection ring */}
                        {isSelected && (
                          <circle cx={n.x} cy={n.y} r={4.5} fill="none" stroke="hsl(190,95%,55%)" strokeWidth={0.3} opacity={0.8}>
                            <animate attributeName="r" values="3.5;5;3.5" dur="2s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite" />
                          </circle>
                        )}
                        {(isFraud || isMule) && (<circle cx={n.x} cy={n.y} r={3} fill={fill} opacity={0.15} className="animate-pulse" />)}
                        <circle cx={n.x} cy={n.y} r={r} fill={fill}
                          className={`transition-all duration-500 ${isClickable ? "cursor-pointer" : ""}`}
                          onMouseEnter={() => setHoveredNode(n.id)}
                          onMouseLeave={() => setHoveredNode(null)}
                          onClick={() => isClickable && handleNodeClick(n)}
                          style={{ filter: isFraud || isMule || isSelected ? `drop-shadow(0 0 ${isSelected ? '5' : '3'}px ${fill})` : undefined }} />
                        {hoveredNode === n.id && (
                          <text x={n.x} y={n.y - 3} textAnchor="middle" fill="hsl(210,40%,96%)" fontSize="2" fontFamily="monospace">{n.id}</text>
                        )}
                      </g>
                    );
                  })}
                </motion.svg>
              </AnimatePresence>
            </div>

            {/* Slide-out Detail Panel */}
            <AnimatePresence>
              {selectedNode && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 340, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden flex-shrink-0"
                >
                  <div className="w-[340px] h-full bg-secondary/30 rounded-xl border border-white/[0.06] p-4 overflow-y-auto max-h-[600px]">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Fingerprint className="w-4 h-4 text-primary" />
                        <span className="font-mono text-sm font-bold">{selectedNode}</span>
                      </div>
                      <button
                        onClick={() => { setSelectedNode(null); setNodeDetail(null); }}
                        className="p-1 rounded-md hover:bg-white/[0.06] transition-colors"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>

                    {loadingDetail ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    ) : nodeDetail ? (
                      <div className="space-y-4">
                        {/* Status badges */}
                        <div className="flex flex-wrap gap-2">
                          {nodeDetail.is_fraud && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/20 text-destructive border border-destructive/20 font-bold">
                              FRAUD NODE
                            </span>
                          )}
                          {nodeDetail.is_mule && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[hsl(38,92%,55%)]/20 text-[hsl(38,92%,55%)] border border-[hsl(38,92%,55%)]/20 font-bold">
                              MULE ACCOUNT
                            </span>
                          )}
                          {nodeDetail.in_cycle && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/20 font-bold">
                              CIRCULAR FLOW
                            </span>
                          )}
                        </div>

                        {/* Mule Score */}
                        <div className="bg-secondary/40 rounded-lg p-3">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Mule Score</div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2.5 rounded-full bg-secondary/50 overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{
                                  background: nodeDetail.mule_score > 0.7
                                    ? "hsl(0,72%,55%)"
                                    : nodeDetail.mule_score > 0.4
                                    ? "hsl(38,92%,55%)"
                                    : "hsl(152,70%,48%)",
                                }}
                                initial={{ width: 0 }}
                                animate={{ width: `${nodeDetail.mule_score * 100}%` }}
                                transition={{ duration: 0.8 }}
                              />
                            </div>
                            <span className="font-mono text-sm font-bold text-foreground">
                              {(nodeDetail.mule_score * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>

                        {/* Money Funneled */}
                        <div className="bg-secondary/40 rounded-lg p-3">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Money Funneled</div>
                          <div className="text-xl font-mono font-bold text-foreground">
                            ₹{nodeDetail.total_funneled.toLocaleString()}
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="flex items-center gap-1.5 text-xs">
                              <ArrowDownLeft className="w-3 h-3 text-[hsl(152,70%,48%)]" />
                              <span className="text-muted-foreground">In:</span>
                              <span className="font-mono text-foreground">₹{nodeDetail.total_money_in.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs">
                              <ArrowUpRight className="w-3 h-3 text-[hsl(0,72%,55%)]" />
                              <span className="text-muted-foreground">Out:</span>
                              <span className="font-mono text-foreground">₹{nodeDetail.total_money_out.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Graph Metrics */}
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: "Community", value: `C${String(nodeDetail.community).padStart(3, '0')}`, icon: Network },
                            { label: "PageRank", value: nodeDetail.pagerank.toFixed(4), icon: BarChart3 },
                            { label: "In-Degree", value: nodeDetail.in_degree, icon: ArrowDownLeft },
                            { label: "Out-Degree", value: nodeDetail.out_degree, icon: ArrowUpRight },
                          ].map(({ label, value, icon: Icon }) => (
                            <div key={label} className="bg-secondary/30 rounded-lg p-2.5">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Icon className="w-3 h-3 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground">{label}</span>
                              </div>
                              <div className="font-mono text-xs font-bold">{value}</div>
                            </div>
                          ))}
                        </div>

                        {/* Cluster Info */}
                        {nodeDetail.cluster && (
                          <div className="bg-secondary/40 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Fraud Ring</div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                nodeDetail.cluster.risk === "CRITICAL" ? "bg-destructive/20 text-destructive" :
                                nodeDetail.cluster.risk === "HIGH" ? "bg-[hsl(38,92%,55%)]/20 text-[hsl(38,92%,55%)]" :
                                "bg-primary/20 text-primary"
                              }`}>
                                {nodeDetail.cluster.risk}
                              </span>
                            </div>
                            <div className="font-mono text-xs font-bold mb-1">{nodeDetail.cluster.cluster_id}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {nodeDetail.cluster.members} members · {nodeDetail.cluster.fraud_nodes} fraud · {nodeDetail.cluster.mule_nodes} mules · {(nodeDetail.cluster.fraud_ratio * 100).toFixed(0)}% fraud
                            </div>
                          </div>
                        )}

                        {/* Connected Peers */}
                        {(nodeDetail.incoming_peers.length > 0 || nodeDetail.outgoing_peers.length > 0) && (
                          <div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Connected Peers</div>
                            <div className="space-y-1 max-h-[120px] overflow-y-auto">
                              {[...nodeDetail.incoming_peers.map(p => ({ ...p, dir: "in" as const })),
                                ...nodeDetail.outgoing_peers.map(p => ({ ...p, dir: "out" as const }))].map((peer) => (
                                <div key={`${peer.dir}-${peer.id}`} className="flex items-center gap-2 text-xs bg-secondary/20 px-2.5 py-1.5 rounded-md">
                                  {peer.dir === "in" ? (
                                    <ArrowDownLeft className="w-3 h-3 text-[hsl(152,70%,48%)] flex-shrink-0" />
                                  ) : (
                                    <ArrowUpRight className="w-3 h-3 text-[hsl(0,72%,55%)] flex-shrink-0" />
                                  )}
                                  <span className="font-mono text-[10px] flex-1 truncate">{peer.id}</span>
                                  <span className="font-mono text-[10px] text-muted-foreground">₹{peer.amount.toLocaleString()}</span>
                                  {peer.is_fraud && <span className="w-1.5 h-1.5 rounded-full bg-[hsl(0,72%,55%)]" />}
                                  {peer.is_mule && <span className="w-1.5 h-1.5 rounded-full bg-[hsl(38,92%,55%)]" />}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground text-xs py-12">
                        Unable to load node details.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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
