import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip, ReferenceLine, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
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
    <section id="explainable-ai" className="py-24 md:py-32 border-t border-white/[0.04]">
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
              <BarChart data={waterfallData} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 15 }}>
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "hsl(215,20%,55%)" }}
                  tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v.toFixed(0)}%`}
                  label={{ value: "Impact on Risk Score (%)", position: "insideBottom", offset: -10, fill: "hsl(215,20%,55%)", fontSize: 11 }}
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

          {/* Factor breakdown with Radar Chart */}
          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="glass-card p-6 flex flex-col">
            <h4 className="text-sm font-semibold mb-2">Risk Dimensions</h4>
            <p className="text-[10px] text-muted-foreground mb-4">Multivariate anomaly magnitude radar</p>
            <div className="flex-1 w-full relative flex items-center justify-center min-h-[280px]">
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart 
                  cx="50%" cy="50%" outerRadius="70%" 
                  data={factors.map(f => ({
                    subject: f.name.replace("Transaction ", "").replace(" Deviation", "").split(" ")[0],
                    magnitude: Math.min(Math.abs(f.impact) * 2.5, 100) // Visual scaling
                  }))}
                >
                  <PolarGrid stroke="hsl(222, 30%, 18%)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Anomaly"
                    dataKey="magnitude"
                    stroke="hsl(0, 72%, 55%)"
                    fill="url(#radarGradient)"
                    fillOpacity={0.6}
                  />
                  <defs>
                    <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0, 72%, 55%)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="hsl(190, 95%, 55%)" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(222,40%,10%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                    itemStyle={{ color: "hsl(210,40%,96%)", fontSize: "12px" }}
                    labelStyle={{ display: "none" }}
                    formatter={(val: number) => [`${val.toFixed(1)}% Intensity`, "Magnitude"]}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {factors.slice(0, 3).map((f, i) => (
                <div key={i} className="text-[9px] px-2 py-1 rounded bg-secondary/50 border border-white/[0.04]">
                  <span style={{ color: f.color }} className="font-bold">{f.direction === "increases_risk" ? "+" : "-"}{f.impact.toFixed(1)}%</span> {f.name.split(" ")[0]}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ExplainableAI;
