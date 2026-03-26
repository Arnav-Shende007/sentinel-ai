import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { AlertTriangle, Loader2, Clock, ShieldAlert, Smartphone, MapPin, Users, CreditCard, Fingerprint, Activity } from "lucide-react";

interface Target {
  user_id: string;
  risk_probability: number;
  reason: string;
  estimated_time: string;
  recommended_action: string;
}
interface ForecastData {
  at_risk_accounts: Target[];
  trend_data: { day: string; risk: number; predicted?: number }[];
}

/* ── Attack vector generation from reason string ── */
const vectorIcons: Record<string, typeof Smartphone> = {
  "Device Risk": Smartphone,
  "Geo Anomaly": MapPin,
  "Network Proximity": Users,
  "Amount Pattern": CreditCard,
  "Identity Risk": Fingerprint,
  "Behavioral Drift": Activity,
};

const generateVectors = (reason: string, probability: number) => {
  const vectors: { name: string; value: number }[] = [];
  const r = reason.toLowerCase();

  vectors.push({ name: "Device Risk", value: r.includes("device") ? 60 + probability * 0.3 : 15 + Math.random() * 20 });
  vectors.push({ name: "Geo Anomaly", value: r.includes("geo") ? 70 + probability * 0.2 : 10 + Math.random() * 25 });
  vectors.push({ name: "Network Proximity", value: r.includes("pattern") || r.includes("profile") ? 55 + probability * 0.3 : 20 + Math.random() * 15 });
  vectors.push({ name: "Amount Pattern", value: r.includes("amount") || r.includes("variance") ? 65 + probability * 0.25 : 12 + Math.random() * 18 });
  vectors.push({ name: "Identity Risk", value: r.includes("recipient") ? 50 + probability * 0.35 : 8 + Math.random() * 22 });
  vectors.push({ name: "Behavioral Drift", value: 25 + probability * 0.5 + Math.random() * 10 });

  return vectors.map(v => ({ ...v, value: Math.min(Math.round(v.value), 100) }));
};

/* ── Threat level classification ── */
const getThreatLevel = (prob: number) => {
  if (prob >= 80) return { label: "CRITICAL", color: "hsl(0,72%,55%)", bg: "bg-[hsl(0,72%,55%)]" };
  if (prob >= 60) return { label: "HIGH", color: "hsl(38,92%,55%)", bg: "bg-[hsl(38,92%,55%)]" };
  return { label: "ELEVATED", color: "hsl(190,95%,55%)", bg: "bg-primary" };
};

/* ── Countdown parser ── */
const parseCountdownHours = (est: string): number => {
  const match = est.match(/(\d+)/);
  return match ? parseInt(match[1]) : 12;
};

const FuturePrediction = () => {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  useEffect(() => {
    fetch("/api/forecast")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Compute the global threat condition from the top accounts
  const globalThreat = useMemo(() => {
    if (!data) return null;
    const avgRisk = data.at_risk_accounts.slice(0, 5).reduce((s, a) => s + a.risk_probability, 0) / Math.min(data.at_risk_accounts.length, 5);
    return getThreatLevel(avgRisk);
  }, [data]);

  if (loading) {
    return (
      <section className="py-24 md:py-32 border-t border-white/[0.04]">
        <div className="section-container flex justify-center items-center min-h-[300px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </section>
    );
  }

  if (!data) return null;

  const selected = data.at_risk_accounts[selectedIdx];
  const threat = selected ? getThreatLevel(selected.risk_probability) : null;
  const vectors = selected ? generateVectors(selected.reason, selected.risk_probability) : [];
  const countdownHrs = selected ? parseCountdownHours(selected.estimated_time) : 0;

  // Add cone of uncertainty to trend data
  const enhancedTrend = data.trend_data.map((d, i) => ({
    ...d,
    upper: d.predicted ? Math.round(d.predicted + 8 + i * 0.5) : undefined,
    lower: d.predicted ? Math.round(Math.max(0, d.predicted - 8 - i * 0.3)) : undefined,
  }));

  return (
    <section id="prediction" className="py-24 md:py-32 border-t border-white/[0.04]">
      <div className="section-container">
        {/* Header + Global Threat */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-6"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Future Fraud <span className="gradient-text">Prediction</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Logistic Regression models predict which accounts are likely targets in the next 24 hours.
          </p>
        </motion.div>

        {/* Global Threat Banner */}
        {globalThreat && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8 p-4 rounded-xl border relative overflow-hidden"
            style={{ borderColor: `${globalThreat.color}30`, background: `${globalThreat.color}08` }}
          >
            <div className="absolute top-0 left-0 w-1 h-full" style={{ background: globalThreat.color }} />
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5" style={{ color: globalThreat.color }} />
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: globalThreat.color }}>
                    Threat Condition: {globalThreat.label}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {data.at_risk_accounts.length} accounts flagged for proactive intervention in the next 24–48 hrs.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: globalThreat.color }} />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: globalThreat.color }} />
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">LIVE MONITORING</span>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left: Chart + Attack Vectors (3 cols) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Trend Chart with Cone of Uncertainty */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="glass-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold">Risk Trend & Forecast</h4>
                <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-secondary/50 text-muted-foreground">14-day window</span>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={enhancedTrend} margin={{ top: 10, right: 10, left: 10, bottom: 15 }}>
                  <defs>
                    <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(190,95%,55%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(190,95%,55%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="coneGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0,72%,55%)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(0,72%,55%)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,30%,16%)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(215,20%,55%)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(215,20%,55%)" }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "hsl(222,40%,10%)", border: "1px solid hsl(222,30%,20%)", borderRadius: 8, fontSize: 12 }} />
                  {/* Cone of uncertainty */}
                  <Area type="monotone" dataKey="upper" stroke="none" fill="url(#coneGradient)" />
                  <Area type="monotone" dataKey="lower" stroke="none" fill="url(#coneGradient)" />
                  {/* Actual risk */}
                  <Area type="monotone" dataKey="risk" stroke="hsl(190,95%,55%)" strokeWidth={2} fill="url(#riskGradient)" dot={false} />
                  {/* Predicted */}
                  <Area type="monotone" dataKey="predicted" stroke="hsl(0,72%,55%)" strokeWidth={2} strokeDasharray="6 3" fill="none" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground justify-center">
                <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-primary" /> Actual</span>
                <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-destructive" style={{ borderTop: "2px dashed hsl(0,72%,55%)" }} /> Predicted</span>
                <span className="flex items-center gap-1.5"><span className="w-4 h-2 rounded-sm bg-destructive/20" /> Uncertainty Cone</span>
              </div>
            </motion.div>

            {/* Attack Vector Radar (shows for selected target) */}
            <AnimatePresence mode="wait">
              {selected && (
                <motion.div
                  key={selected.user_id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.4 }}
                  className="glass-card p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold">Attack Vector Analysis</h4>
                    <span className="font-mono text-xs text-primary">{selected.user_id}</span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Radar */}
                    <div className="flex items-center justify-center">
                      <ResponsiveContainer width="100%" height={220}>
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={vectors}>
                          <PolarGrid stroke="hsl(222, 30%, 18%)" />
                          <PolarAngleAxis dataKey="name" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 9 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar name="Risk" dataKey="value" stroke={threat?.color || "hsl(0,72%,55%)"} fill={threat?.color || "hsl(0,72%,55%)"} fillOpacity={0.2} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Vector breakdown bars */}
                    <div className="flex flex-col gap-2 justify-center">
                      {vectors.map((v, i) => {
                        const Icon = vectorIcons[v.name] || Activity;
                        return (
                          <motion.div
                            key={v.name}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.06 }}
                            className="flex items-center gap-2"
                          >
                            <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-[10px] text-foreground/70 w-24 truncate">{v.name}</span>
                            <div className="flex-1 h-2 rounded-full bg-secondary/50 overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ background: v.value > 60 ? "hsl(0,72%,55%)" : v.value > 35 ? "hsl(38,92%,55%)" : "hsl(152,70%,48%)" }}
                                initial={{ width: 0 }}
                                animate={{ width: `${v.value}%` }}
                                transition={{ duration: 0.8, delay: i * 0.08 }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{v.value}%</span>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Target List (2 cols) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-2 glass-card p-6"
          >
            <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[hsl(38,92%,55%)]" /> Likely Targets (Next 24 hrs)
            </h4>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {data.at_risk_accounts.slice(0, 8).map((t, i) => {
                const tl = getThreatLevel(t.risk_probability);
                const isSelected = i === selectedIdx;
                const hrs = parseCountdownHours(t.estimated_time);
                return (
                  <motion.div
                    key={t.user_id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => setSelectedIdx(i)}
                    className={`rounded-lg p-4 border cursor-pointer transition-all duration-300 ${
                      isSelected
                        ? "bg-primary/10 border-primary/30 shadow-[0_0_15px_hsl(190,95%,55%,0.1)]"
                        : "bg-secondary/30 border-white/[0.04] hover:border-white/[0.1]"
                    }`}
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs text-foreground">{t.user_id}</span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold border"
                        style={{ color: tl.color, borderColor: `${tl.color}40`, background: `${tl.color}15` }}
                      >
                        {tl.label}
                      </span>
                    </div>
                    {/* Risk bar */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: tl.color }}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${t.risk_probability}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: i * 0.1 }}
                        />
                      </div>
                      <span className="font-mono text-xs font-bold" style={{ color: tl.color }}>{t.risk_probability}%</span>
                    </div>
                    {/* Reason */}
                    <p className="text-[10px] text-muted-foreground mb-2 leading-relaxed">{t.reason}</p>
                    {/* Footer: Countdown + Action */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[10px]" style={{ color: tl.color }}>
                        <Clock className="w-3 h-3" />
                        <span className="font-mono font-bold">T-{String(hrs).padStart(2, "0")}:00:00</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-semibold">{t.recommended_action}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FuturePrediction;
