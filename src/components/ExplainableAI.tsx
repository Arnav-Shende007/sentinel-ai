import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip, ReferenceLine } from "recharts";
import { Loader2 } from "lucide-react";

interface Factor { name: string; feature_key: string; impact: number; direction: string; color: string; }
interface ExplainableData { transaction_id: string; fraud_score: number; factors: Factor[]; }

const featureTooltips: Record<string, string> = {
  "Transaction Amount": "Log-scaled transaction value — higher amounts flag more often in UPI fraud",
  "Amount Deviation": "This transaction is multiple standard deviations from the user's historical average",
  "Transaction Hour": "Time-of-day risk weight — late-night transactions carry higher signal",
  "Night Transaction": "Transactions between 12 AM and 5 AM are flagged with elevated risk",
  "Weekend": "Weekend activity deviates from typical weekday behavioral norms",
  "Device Change": "A new or previously unseen device was detected for this account",
  "New Recipient": "The receiver has never interacted with this sender before",
  "Geo Distance": "Geo-location is significantly distant from the user's usual transaction origin",
  "Daily Frequency": "Number of transactions today exceeds the user's normal daily pattern",
  "Day of Week": "Certain days show statistically higher fraud prevalence in historical data",
};

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: { name: string; signedImpact: number; direction: string } }[] }) => {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  const tip = featureTooltips[d.name] || "";
  return (
    <div className="bg-[hsl(222,40%,10%)] border border-white/10 rounded-lg p-3 max-w-[260px] shadow-xl">
      <div className="text-xs text-foreground font-semibold mb-1">{d.name}</div>
      <div className="text-[10px] text-muted-foreground mb-1.5">
        {d.direction === "increases_risk" ? "⬆ Increases" : "⬇ Decreases"} risk by {Math.abs(d.signedImpact).toFixed(1)}%
      </div>
      {tip && <div className="text-[10px] text-primary/70 leading-relaxed">{tip}</div>}
    </div>
  );
};

const ExplainableAI = () => {
  const [data, setData] = useState<ExplainableData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/explainable").then((r) => r.json()).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="py-24 md:py-32 border-t border-white/[0.04]">
        <div className="section-container flex justify-center items-center min-h-[300px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </section>
    );
  }

  const factors = data?.factors || [];
  // Build waterfall data: positive impact goes right, negative goes left
  const waterfallData = factors.map(f => ({
    name: f.name,
    signedImpact: f.direction === "increases_risk" ? f.impact : -f.impact,
    direction: f.direction,
    color: f.color,
  })).sort((a, b) => b.signedImpact - a.signedImpact);

  return (
    <section className="py-24 md:py-32 border-t border-white/[0.04]">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Explainable <span className="gradient-text">AI</span></h2>
          <p className="text-muted-foreground max-w-lg mx-auto">SHAP-powered feature importance — no black boxes. Every flag comes with a reason.</p>
          {data && (
            <p className="text-xs text-primary/60 mt-2 font-mono">
              Showing explanation for {data.transaction_id} · Fraud Score: {(data.fraud_score * 100).toFixed(1)}%
            </p>
          )}
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Waterfall Chart */}
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="glass-card p-6">
            <h4 className="text-sm font-semibold mb-2">SHAP Waterfall Chart</h4>
            <p className="text-[10px] text-muted-foreground mb-4">← Reduces risk &nbsp;|&nbsp; Increases risk →</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={waterfallData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "hsl(215,20%,55%)" }}
                  tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v.toFixed(0)}%`}
                />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(210,40%,96%)" }} width={130} />
                <ReferenceLine x={0} stroke="hsl(210,40%,96%)" strokeWidth={1} strokeOpacity={0.3} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(222,30%,16%)", opacity: 0.5 }} />
                <Bar dataKey="signedImpact" radius={[4, 4, 4, 4]} barSize={20}>
                  {waterfallData.map((f, i) => (
                    <Cell key={i} fill={f.signedImpact > 0 ? "hsl(0,72%,55%)" : "hsl(152,70%,48%)"} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Factor breakdown with bars */}
          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="glass-card p-6">
            <h4 className="text-sm font-semibold mb-4">Transaction Flagged Due To:</h4>
            <div className="space-y-3">
              {factors.map((f, i) => (
                <motion.div key={f.name} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="group relative">
                  <div className="flex items-center gap-3">
                    <div className="w-14 text-right font-mono text-sm font-bold" style={{ color: f.color }}>
                      {f.direction === "increases_risk" ? "+" : "-"}{f.impact.toFixed(1)}%
                    </div>
                    <div className="flex-1 h-2.5 bg-secondary/50 rounded-full overflow-hidden relative">
                      {/* Center line */}
                      <div className="absolute inset-y-0 left-1/2 w-px bg-white/10 z-10" />
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${Math.min(f.impact * 2.5, 50)}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className="h-full rounded-full"
                        style={{
                          background: f.color,
                          position: "absolute",
                          ...(f.direction === "increases_risk"
                            ? { left: "50%" }
                            : { right: "50%" })
                        }}
                      />
                    </div>
                    <span className="text-sm text-foreground/80 min-w-[130px]">{f.name}</span>
                  </div>
                  {/* Hover tooltip */}
                  {featureTooltips[f.name] && (
                    <div className="ml-[4.5rem] mt-1 text-[10px] text-primary/50 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-200 max-w-md">
                      💡 {featureTooltips[f.name]}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ExplainableAI;
