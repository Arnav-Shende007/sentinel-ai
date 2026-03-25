import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts";
import { AlertTriangle, Loader2 } from "lucide-react";

interface Target { user_id: string; risk_probability: number; reason: string; estimated_time: string; recommended_action: string; }
interface ForecastData { at_risk_accounts: Target[]; trend_data: { day: string; risk: number; predicted?: number }[]; }

const FuturePrediction = () => {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/forecast").then((r) => r.json()).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="py-24 md:py-32 border-t border-white/[0.04]">
        <div className="section-container flex justify-center items-center min-h-[300px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </section>
    );
  }

  if (!data) return null;

  return (
    <section id="prediction" className="py-24 md:py-32 border-t border-white/[0.04]">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Future Fraud <span className="gradient-text">Prediction</span></h2>
          <p className="text-muted-foreground max-w-lg mx-auto">Logistic Regression models predict which accounts are likely targets in the next 24 hours.</p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="glass-card p-6">
            <h4 className="text-sm font-semibold mb-4">Risk Trend & Forecast</h4>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.trend_data} margin={{ top: 10, right: 10, left: 10, bottom: 15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,30%,16%)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(215,20%,55%)" }} label={{ value: "Day", position: "insideBottom", offset: -10, fill: "hsl(215,20%,55%)", fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(215,20%,55%)" }} domain={[0, 100]} label={{ value: "Risk Probability (%)", angle: -90, position: "insideLeft", fill: "hsl(215,20%,55%)", fontSize: 11, style: { textAnchor: 'middle' } }} />
                <Tooltip contentStyle={{ background: "hsl(222,40%,10%)", border: "1px solid hsl(222,30%,20%)", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="risk" stroke="hsl(190,95%,55%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="predicted" stroke="hsl(0,72%,55%)" strokeWidth={2} strokeDasharray="6 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground justify-center">
              <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-primary" /> Actual</span>
              <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-destructive border-dashed" style={{ borderTop: "2px dashed hsl(0,72%,55%)" }} /> Predicted</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="glass-card p-6">
            <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[hsl(38,92%,55%)]" /> Likely Targets (Next 24 hrs)
            </h4>
            <div className="space-y-3">
              {data.at_risk_accounts.slice(0, 4).map((t, i) => (
                <motion.div key={t.user_id} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="bg-secondary/30 rounded-lg p-4 border border-white/[0.04]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-foreground">{t.user_id}</span>
                    <span className="font-mono text-sm font-bold text-[hsl(0,72%,55%)]">{t.risk_probability}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.reason}</p>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-primary/60">Est: {t.estimated_time}</span>
                    <span className="text-[10px] text-[hsl(38,92%,55%)]">{t.recommended_action}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FuturePrediction;
