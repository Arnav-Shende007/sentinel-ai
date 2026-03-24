import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, AlertTriangle, CheckCircle2, XCircle, RotateCcw, ShieldCheck, ShieldAlert } from "lucide-react";
import RiskGauge from "./RiskGauge";

interface FeatureContribution {
  feature: string;
  contribution: number;
  value: number;
}

interface RiskAssessment {
  fraud_probability: number;
  risk_score: number;
  risk_category: string;
  decision: string;
  feature_contributions: FeatureContribution[];
  is_fraud_predicted: boolean;
}

interface BehavioralAnalysis {
  anomaly_score: number;
  deviations: { factor: string; detail: string }[];
}

interface ScoreResult {
  risk_assessment: RiskAssessment;
  behavioral_analysis: BehavioralAnalysis;
  device_geo_intel: { device_geo_risk: number; risks: { type: string; severity: string; detail: string }[] };
}

const defaultForm = {
  sender: "UPI-1000000001",
  receiver: "UPI-1000000002",
  amount: "24500",
  time: "02:30",
  device: "New Android",
  location: "Mumbai",
};

const safeExample = {
  sender: "UPI-1000000012",
  receiver: "UPI-1000000008",
  amount: "350",
  time: "14:15",
  device: "Trusted iPhone",
  location: "Bangalore",
};

const fraudExample = {
  sender: "UPI-1000000047",
  receiver: "UPI-1000000099",
  amount: "49800",
  time: "03:12",
  device: "New Android",
  location: "Unknown VPN",
};

const featureLabels: Record<string, string> = {
  amount_log: "Transaction Amount",
  amount_zscore: "Amount Deviation",
  hour: "Transaction Hour",
  is_night: "Night Transaction",
  is_weekend: "Weekend",
  device_changed: "Device Change",
  is_new_recipient: "New Recipient",
  geo_distance_km: "Geo Distance",
  txn_count_daily: "Daily Frequency",
  day_of_week: "Day of Week",
};

const featureTooltips: Record<string, string> = {
  amount_log: "Log-scaled transaction amount relative to typical UPI transfers",
  amount_zscore: "Standard deviations from the user's historical average amount",
  hour: "Hour of day when the transaction was initiated",
  is_night: "Transactions between 12 AM – 5 AM carry higher inherent risk",
  is_weekend: "Weekend transactions may differ from weekday behavioral norms",
  device_changed: "A new or previously unseen device was used for this transaction",
  is_new_recipient: "The recipient has never received funds from this sender before",
  geo_distance_km: "Distance between transaction origin and user's usual location",
  txn_count_daily: "Number of transactions from this sender today vs. their average",
  day_of_week: "Day of the week can affect fraud probability patterns",
};

const ANALYSIS_STEPS = [
  { icon: "🔍", label: "Extracting device intelligence...", done: "Device profile extracted" },
  { icon: "🧠", label: "Analyzing behavioral history via Isolation Forest...", done: "Anomaly score computed" },
  { icon: "🕸️", label: "Checking Louvain community thresholds...", done: "Graph risk assessed" },
  { icon: "⚡", label: "Running XGBoost risk scorer...", done: "Final score generated" },
];

const STEP_DELAY = 800; // ms between each step

const LiveDemo = () => {
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(-1);
  const pendingResult = useRef<ScoreResult | null>(null);
  const animationDone = useRef(false);

  // Drive step-by-step animation
  useEffect(() => {
    if (!loading) return;
    setActiveStep(0);
    animationDone.current = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    ANALYSIS_STEPS.forEach((_, i) => {
      if (i === 0) return;
      timers.push(setTimeout(() => setActiveStep(i), STEP_DELAY * i));
    });
    // Mark animation complete after last step has had time to show
    timers.push(setTimeout(() => {
      animationDone.current = true;
      // If API already returned, show result now
      if (pendingResult.current) {
        setResult(pendingResult.current);
        pendingResult.current = null;
        setLoading(false);
      }
    }, STEP_DELAY * ANALYSIS_STEPS.length));
    return () => timers.forEach(clearTimeout);
  }, [loading]);

  const handleSimulate = useCallback(async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    pendingResult.current = null;
    animationDone.current = false;
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: form.sender,
          receiver: form.receiver,
          amount: parseFloat(form.amount),
          time: form.time,
          device: form.device,
          location: form.location,
        }),
      });
      if (!res.ok) throw new Error("API Error");
      const data = await res.json();
      // If animation is done, show immediately. Otherwise, queue it.
      if (animationDone.current) {
        setResult(data);
        setLoading(false);
      } else {
        pendingResult.current = data;
      }
    } catch {
      setError("Could not reach AI engine. Make sure the backend is running.");
      setLoading(false);
    }
  }, [form]);

  const update = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const riskScore = result?.risk_assessment.risk_score ?? 0;
  const status = riskScore < 40 ? "safe" : riskScore < 70 ? "suspicious" : "fraud";
  const StatusIcon = status === "safe" ? CheckCircle2 : status === "suspicious" ? AlertTriangle : XCircle;
  const statusColor = status === "safe" ? "text-[hsl(152,70%,48%)]" : status === "suspicious" ? "text-[hsl(38,92%,55%)]" : "text-[hsl(0,72%,55%)]";

  return (
    <section id="demo" className="py-24 md:py-32 border-t border-white/[0.04]">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Live <span className="gradient-text">Demo</span> Simulation</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">Simulate a UPI transaction and watch the AI engine analyze it in real-time.</p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input */}
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4">Transaction Input</h3>

            {/* Preset buttons */}
            <div className="flex flex-wrap gap-2 mb-5">
              <button onClick={() => setForm(safeExample)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[hsl(152,70%,48%)]/10 text-[hsl(152,70%,48%)] border border-[hsl(152,70%,48%)]/20 hover:bg-[hsl(152,70%,48%)]/20 transition-all duration-200">
                <ShieldCheck className="w-3.5 h-3.5" /> Load Safe Example
              </button>
              <button onClick={() => setForm(fraudExample)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[hsl(0,72%,55%)]/10 text-[hsl(0,72%,55%)] border border-[hsl(0,72%,55%)]/20 hover:bg-[hsl(0,72%,55%)]/20 transition-all duration-200">
                <ShieldAlert className="w-3.5 h-3.5" /> Load Fraud Example
              </button>
              <button onClick={() => { setForm(defaultForm); setResult(null); setError(null); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary/50 text-muted-foreground border border-white/[0.06] hover:bg-secondary/80 transition-all duration-200">
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {([
                ["sender", "Sender ID"], ["receiver", "Receiver ID"], ["amount", "Amount (₹)"],
                ["time", "Time (HH:MM)"], ["device", "Device Type"], ["location", "Location"],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <label className="text-xs text-muted-foreground mb-1.5 block">{label}</label>
                  <input className="w-full px-3 py-2.5 rounded-lg bg-secondary/50 border border-white/[0.06] text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all" value={form[key]} onChange={(e) => update(key, e.target.value)} />
                </div>
              ))}
            </div>
            <button onClick={handleSimulate} disabled={loading} className="btn-primary w-full mt-6 disabled:opacity-50">
              {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>) : (<><Send className="w-4 h-4" /> Analyze Transaction</>)}
            </button>
          </motion.div>

          {/* Output */}
          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="glass-card p-6 flex flex-col">
            <h3 className="text-lg font-semibold mb-6">AI Analysis Result</h3>
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col justify-center gap-3 py-4">
                  {ANALYSIS_STEPS.map((step, i) => {
                    const isActive = i === activeStep;
                    const isDone = i < activeStep;
                    const isPending = i > activeStep;
                    return (
                      <motion.div
                        key={step.label}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: isPending ? 0.3 : 1, x: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.35 }}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all duration-500 ${
                          isActive
                            ? "bg-primary/10 border-primary/30 shadow-[0_0_15px_hsl(190,95%,55%,0.1)]"
                            : isDone
                            ? "bg-[hsl(152,70%,48%)]/5 border-[hsl(152,70%,48%)]/20"
                            : "bg-secondary/20 border-white/[0.04]"
                        }`}
                      >
                        <span className="text-base flex-shrink-0">
                          {isDone ? "✅" : step.icon}
                        </span>
                        <span className={`text-xs font-mono flex-1 ${isActive ? "text-primary" : isDone ? "text-[hsl(152,70%,48%)]" : "text-muted-foreground"}`}>
                          {isDone ? step.done : step.label}
                        </span>
                        {isActive && (
                          <motion.div
                            className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                          />
                        )}
                      </motion.div>
                    );
                  })}
                  <div className="flex items-center gap-2 mt-2 px-4">
                    <div className="flex-1 h-1 rounded-full bg-secondary/50 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-[hsl(260,70%,60%)]"
                        initial={{ width: "0%" }}
                        animate={{ width: `${((activeStep + 1) / ANALYSIS_STEPS.length) * 100}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">{activeStep + 1}/{ANALYSIS_STEPS.length}</span>
                  </div>
                </motion.div>
              ) : error ? (
                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex items-center justify-center text-destructive text-sm">{error}</motion.div>
              ) : result ? (
                <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col gap-4">
                  <div className="flex items-center gap-6">
                    <RiskGauge score={riskScore} />
                    <div>
                      <div className={`flex items-center gap-2 text-lg font-bold ${statusColor}`}>
                        <StatusIcon className="w-5 h-5" />
                        {result.risk_assessment.risk_category}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Probability: <span className="text-foreground font-mono">{(result.risk_assessment.fraud_probability * 100).toFixed(1)}%</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Decision: <span className={`font-mono font-bold ${result.risk_assessment.decision === "BLOCK" ? "text-[hsl(0,72%,55%)]" : result.risk_assessment.decision === "OTP_REVERIFY" ? "text-[hsl(38,92%,55%)]" : "text-[hsl(152,70%,48%)]"}`}>{result.risk_assessment.decision}</span>
                      </div>
                    </div>
                  </div>

                  {/* SHAP feature contributions — waterfall style */}
                  <div>
                    <div className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wider">SHAP Feature Contributions</div>
                    <div className="flex flex-col gap-1.5">
                      {result.risk_assessment.feature_contributions.slice(0, 5).map((c, i) => {
                        const maxAbsContrib = Math.max(...result.risk_assessment.feature_contributions.slice(0, 5).map(f => Math.abs(f.contribution)));
                        const barPercent = maxAbsContrib > 0 ? (Math.abs(c.contribution) / maxAbsContrib) * 45 : 0;
                        const isPositive = c.contribution > 0;
                        const tooltip = featureTooltips[c.feature] || "";
                        return (
                          <motion.div key={c.feature} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="group relative flex items-center gap-2 text-sm bg-secondary/30 px-3 py-1.5 rounded-lg">
                            <span className={`font-mono text-xs font-bold min-w-[50px] text-right ${isPositive ? "text-[hsl(0,72%,55%)]" : "text-[hsl(152,70%,48%)]"}`}>
                              {isPositive ? "+" : ""}{c.contribution.toFixed(3)}
                            </span>
                            {/* Mini waterfall bar */}
                            <div className="flex-1 h-3 relative">
                              <div className="absolute inset-y-0 left-1/2 w-px bg-white/10" />
                              <motion.div
                                className={`absolute top-0 h-full rounded-sm ${isPositive ? "bg-[hsl(0,72%,55%)]/60" : "bg-[hsl(152,70%,48%)]/60"}`}
                                style={isPositive ? { left: "50%" } : { right: "50%" }}
                                initial={{ width: 0 }}
                                animate={{ width: `${barPercent}%` }}
                                transition={{ duration: 0.6, delay: i * 0.1 }}
                              />
                            </div>
                            <span className="text-foreground/80 text-xs min-w-[100px]">{featureLabels[c.feature] || c.feature}</span>
                            {/* Tooltip */}
                            {tooltip && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-[hsl(222,40%,10%)] border border-white/10 text-[10px] text-muted-foreground w-56 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 shadow-xl">
                                {tooltip}
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Behavioral deviations */}
                  {result.behavioral_analysis.deviations.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wider">Behavioral Analysis</div>
                      {result.behavioral_analysis.deviations.slice(0, 3).map((d, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-foreground/70 bg-secondary/20 px-3 py-1.5 rounded-lg mb-1">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${d.factor === "normal" ? "bg-[hsl(152,70%,48%)]" : "bg-[hsl(38,92%,55%)]"}`} />
                          {d.detail}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  Enter transaction details and click Analyze
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default LiveDemo;
