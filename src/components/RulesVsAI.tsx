import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, ShieldCheck, ShieldAlert, Loader2, CheckCircle2, XCircle, Zap, BookOpen, AlertTriangle } from "lucide-react";

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
}

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

const sneakyDefault = {
  sender: "UPI-1000000047",
  receiver: "UPI-1000000099",
  amount: "480",
  time: "03:00",
  device: "New Android",
  location: "Unknown VPN",
};

// Static rules that banks actually use
const LEGACY_RULES = [
  { name: "Amount Threshold", check: (txn: typeof sneakyDefault) => parseFloat(txn.amount) > 10000, failMsg: "Amount ₹{amt} exceeds ₹10,000 limit", passMsg: "Amount ₹{amt} is under ₹10,000 limit" },
  { name: "Daily Limit", check: () => false, failMsg: "Daily limit exceeded", passMsg: "Within daily transaction limits" },
  { name: "Blocked Merchant List", check: () => false, failMsg: "Receiver is on blocked list", passMsg: "Receiver not on blocked merchant list" },
  { name: "Duplicate Check", check: () => false, failMsg: "Duplicate transaction detected", passMsg: "No duplicate transaction detected" },
];

const RulesVsAI = () => {
  const [form, setForm] = useState(sneakyDefault);
  const [rulesResult, setRulesResult] = useState<{ passed: boolean; checks: { name: string; passed: boolean; msg: string }[] } | null>(null);
  const [aiResult, setAiResult] = useState<ScoreResult | null>(null);
  const [loadingRules, setLoadingRules] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [rulesFlash, setRulesFlash] = useState<"green" | "red" | null>(null);
  const [aiFlash, setAiFlash] = useState<"green" | "red" | null>(null);

  const update = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleRulesCheck = useCallback(() => {
    setLoadingRules(true);
    setRulesResult(null);
    setRulesFlash(null);

    // Simulate processing delay
    setTimeout(() => {
      const checks = LEGACY_RULES.map((rule) => {
        const failed = rule.check(form);
        return {
          name: rule.name,
          passed: !failed,
          msg: failed
            ? rule.failMsg.replace("{amt}", form.amount)
            : rule.passMsg.replace("{amt}", form.amount),
        };
      });

      const allPassed = checks.every((c) => c.passed);
      setRulesResult({ passed: allPassed, checks });
      setRulesFlash(allPassed ? "green" : "red");
      setLoadingRules(false);

      setTimeout(() => setRulesFlash(null), 2000);
    }, 800);
  }, [form]);

  const handleAICheck = useCallback(async () => {
    setLoadingAI(true);
    setAiResult(null);
    setAiFlash(null);

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
      setAiResult(data);

      const score = data.risk_assessment.risk_score;
      setAiFlash(score >= 70 ? "red" : "green");
      setTimeout(() => setAiFlash(null), 2000);
    } catch {
      // fallback
    } finally {
      setLoadingAI(false);
    }
  }, [form]);

  return (
    <section id="rules-vs-ai" className="py-24 md:py-32 border-t border-white/[0.04]">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Static Rules vs <span className="gradient-text">Sentinel AI</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Banks rely on static rules like "if amount &lt; ₹10,000, approve." Enter a sneaky transaction and see why AI
            catches what rules miss.
          </p>
        </motion.div>

        {/* Input */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card p-6 max-w-3xl mx-auto mb-8"
        >
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" /> Transaction Input
            <span className="text-[10px] text-muted-foreground font-normal ml-auto">
              Pre-filled: sneaky low-amount fraud attempt
            </span>
          </h3>
          <div className="grid sm:grid-cols-3 gap-3">
            {([
              ["amount", "Amount (₹)"],
              ["time", "Time (HH:MM)"],
              ["device", "Device"],
              ["location", "Location"],
              ["sender", "Sender ID"],
              ["receiver", "Receiver ID"],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                <input
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-white/[0.06] text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                  value={form[key]}
                  onChange={(e) => update(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Side by side comparison */}
        <div className="grid lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Legacy Rules Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className={`glass-card p-6 relative overflow-hidden transition-all duration-500 ${
              rulesFlash === "green" ? "ring-2 ring-[hsl(152,70%,48%)] shadow-[0_0_30px_hsl(152,70%,48%,0.2)]" :
              rulesFlash === "red" ? "ring-2 ring-[hsl(0,72%,55%)] shadow-[0_0_30px_hsl(0,72%,55%,0.2)]" : ""
            }`}
          >
            {/* Flash overlay */}
            <AnimatePresence>
              {rulesFlash && (
                <motion.div
                  initial={{ opacity: 0.4 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2 }}
                  className={`absolute inset-0 ${rulesFlash === "green" ? "bg-[hsl(152,70%,48%)]" : "bg-[hsl(0,72%,55%)]"}`}
                  style={{ zIndex: 0 }}
                />
              )}
            </AnimatePresence>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Scale className="w-4 h-4 text-muted-foreground" /> Legacy Static Rules
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/50 text-muted-foreground border border-white/[0.06]">
                  Traditional Banking
                </span>
              </div>

              <button
                onClick={handleRulesCheck}
                disabled={loadingRules}
                className="w-full mb-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-secondary/50 text-foreground border border-white/[0.08] hover:bg-secondary/80 transition-all disabled:opacity-50"
              >
                {loadingRules ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Checking Rules...</>
                ) : (
                  <><Scale className="w-4 h-4" /> Evaluate with Legacy Rules</>
                )}
              </button>

              <AnimatePresence mode="wait">
                {rulesResult ? (
                  <motion.div
                    key="rules-result"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* Verdict */}
                    <div
                      className={`flex items-center gap-3 p-4 rounded-lg mb-4 ${
                        rulesResult.passed
                          ? "bg-[hsl(152,70%,48%)]/10 border border-[hsl(152,70%,48%)]/20"
                          : "bg-[hsl(0,72%,55%)]/10 border border-[hsl(0,72%,55%)]/20"
                      }`}
                    >
                      {rulesResult.passed ? (
                        <CheckCircle2 className="w-8 h-8 text-[hsl(152,70%,48%)]" />
                      ) : (
                        <XCircle className="w-8 h-8 text-[hsl(0,72%,55%)]" />
                      )}
                      <div>
                        <div className={`text-lg font-bold ${rulesResult.passed ? "text-[hsl(152,70%,48%)]" : "text-[hsl(0,72%,55%)]"}`}>
                          {rulesResult.passed ? "PASS" : "FAIL"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {rulesResult.passed
                            ? "All static rule checks passed. Transaction approved."
                            : "One or more rules violated."}
                        </div>
                      </div>
                    </div>

                    {/* Rule checks */}
                    <div className="space-y-2">
                      {rulesResult.checks.map((check, i) => (
                        <motion.div
                          key={check.name}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="flex items-center gap-2 text-xs bg-secondary/20 px-3 py-2 rounded-lg"
                        >
                          {check.passed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(152,70%,48%)] flex-shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-[hsl(0,72%,55%)] flex-shrink-0" />
                          )}
                          <span className="font-mono text-foreground/70">{check.msg}</span>
                        </motion.div>
                      ))}
                    </div>

                    {rulesResult.passed && (
                      <div className="mt-4 p-3 rounded-lg bg-[hsl(38,92%,55%)]/10 border border-[hsl(38,92%,55%)]/20 text-[10px] text-[hsl(38,92%,55%)] flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>
                          Static rules cannot detect: time anomalies, device changes, geo-spoofing, behavioral
                          deviations, or coordinated fraud rings.
                        </span>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="rules-empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-muted-foreground text-xs py-8"
                  >
                    Click "Evaluate with Legacy Rules" to test
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Sentinel AI Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className={`glass-card p-6 relative overflow-hidden transition-all duration-500 ${
              aiFlash === "red" ? "ring-2 ring-[hsl(0,72%,55%)] shadow-[0_0_30px_hsl(0,72%,55%,0.2)]" :
              aiFlash === "green" ? "ring-2 ring-[hsl(152,70%,48%)] shadow-[0_0_30px_hsl(152,70%,48%,0.2)]" : ""
            }`}
          >
            <AnimatePresence>
              {aiFlash && (
                <motion.div
                  initial={{ opacity: 0.4 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2 }}
                  className={`absolute inset-0 ${aiFlash === "red" ? "bg-[hsl(0,72%,55%)]" : "bg-[hsl(152,70%,48%)]"}`}
                  style={{ zIndex: 0 }}
                />
              )}
            </AnimatePresence>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" /> Sentinel AI Engine
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Multi-Layer AI
                </span>
              </div>

              <button
                onClick={handleAICheck}
                disabled={loadingAI}
                className="btn-primary w-full mb-4 text-sm disabled:opacity-50"
              >
                {loadingAI ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                ) : (
                  <><ShieldAlert className="w-4 h-4" /> Evaluate with Sentinel AI</>
                )}
              </button>

              <AnimatePresence mode="wait">
                {aiResult ? (
                  <motion.div
                    key="ai-result"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* Verdict */}
                    {(() => {
                      const score = aiResult.risk_assessment.risk_score;
                      const isBlocked = score >= 70;
                      return (
                        <>
                          <div
                            className={`flex items-center gap-3 p-4 rounded-lg mb-4 ${
                              isBlocked
                                ? "bg-[hsl(0,72%,55%)]/10 border border-[hsl(0,72%,55%)]/20"
                                : "bg-[hsl(152,70%,48%)]/10 border border-[hsl(152,70%,48%)]/20"
                            }`}
                          >
                            {isBlocked ? (
                              <XCircle className="w-8 h-8 text-[hsl(0,72%,55%)]" />
                            ) : (
                              <CheckCircle2 className="w-8 h-8 text-[hsl(152,70%,48%)]" />
                            )}
                            <div>
                              <div className={`text-lg font-bold ${isBlocked ? "text-[hsl(0,72%,55%)]" : "text-[hsl(152,70%,48%)]"}`}>
                                {aiResult.risk_assessment.decision}: Risk Score {score}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Fraud Probability: {(aiResult.risk_assessment.fraud_probability * 100).toFixed(1)}%
                              </div>
                            </div>
                          </div>

                          {/* SHAP feature contributions */}
                          <div className="mb-3">
                            <div className="text-[10px] text-muted-foreground mb-2 font-semibold uppercase tracking-wider">
                              Why AI flagged this — SHAP Explainability
                            </div>
                            <div className="flex flex-col gap-1.5">
                              {aiResult.risk_assessment.feature_contributions.slice(0, 5).map((c, i) => {
                                const maxAbs = Math.max(
                                  ...aiResult.risk_assessment.feature_contributions.slice(0, 5).map((f) => Math.abs(f.contribution))
                                );
                                const barPct = maxAbs > 0 ? (Math.abs(c.contribution) / maxAbs) * 45 : 0;
                                const isPos = c.contribution > 0;
                                return (
                                  <motion.div
                                    key={c.feature}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.08 }}
                                    className="flex items-center gap-2 text-sm bg-secondary/30 px-3 py-1.5 rounded-lg"
                                  >
                                    <span
                                      className={`font-mono text-xs font-bold min-w-[50px] text-right ${
                                        isPos ? "text-[hsl(0,72%,55%)]" : "text-[hsl(152,70%,48%)]"
                                      }`}
                                    >
                                      {isPos ? "+" : ""}
                                      {c.contribution.toFixed(3)}
                                    </span>
                                    <div className="flex-1 h-3 relative">
                                      <div className="absolute inset-y-0 left-1/2 w-px bg-white/10" />
                                      <motion.div
                                        className={`absolute top-0 h-full rounded-sm ${
                                          isPos ? "bg-[hsl(0,72%,55%)]/60" : "bg-[hsl(152,70%,48%)]/60"
                                        }`}
                                        style={isPos ? { left: "50%" } : { right: "50%" }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${barPct}%` }}
                                        transition={{ duration: 0.6, delay: i * 0.1 }}
                                      />
                                    </div>
                                    <span className="text-foreground/80 text-xs min-w-[100px]">
                                      {featureLabels[c.feature] || c.feature}
                                    </span>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Behavioral deviations */}
                          {aiResult.behavioral_analysis.deviations.length > 0 && (
                            <div>
                              <div className="text-[10px] text-muted-foreground mb-2 font-semibold uppercase tracking-wider">
                                Behavioral Anomalies
                              </div>
                              {aiResult.behavioral_analysis.deviations.slice(0, 3).map((d, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 text-xs text-foreground/70 bg-secondary/20 px-3 py-1.5 rounded-lg mb-1"
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                      d.factor === "normal" ? "bg-[hsl(152,70%,48%)]" : "bg-[hsl(38,92%,55%)]"
                                    }`}
                                  />
                                  {d.detail}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </motion.div>
                ) : (
                  <motion.div
                    key="ai-empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-muted-foreground text-xs py-8"
                  >
                    Click "Evaluate with Sentinel AI" to test
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default RulesVsAI;
