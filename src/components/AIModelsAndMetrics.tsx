import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Brain, TreeDeciduous, GitBranch, Activity, Award, Loader2 } from "lucide-react";

/* ── Model cards (static) ── */
const models = [
  {
    icon: Brain,
    name: "Isolation Forest",
    purpose: "Anomaly Detection",
    why: "Isolates outlier transactions that deviate from normal spending patterns without requiring labeled fraud data.",
    output: "Anomaly score (0–1)",
  },
  {
    icon: TreeDeciduous,
    name: "XGBoost / Random Forest",
    purpose: "Fraud Classification",
    why: "Gradient-boosted trees provide high accuracy on tabular transaction features with fast inference time.",
    output: "Fraud probability + feature importance",
  },
  {
    icon: GitBranch,
    name: "Graph Neural Networks",
    purpose: "Fraud Ring Detection",
    why: "Learns relational patterns between accounts to identify coordinated fraud networks invisible to traditional models.",
    output: "Community clusters + suspicious subgraphs",
  },
  {
    icon: Activity,
    name: "LSTM Network",
    purpose: "Behavior Prediction",
    why: "Captures temporal sequences in user behavior to predict future fraud likelihood and detect behavior drift.",
    output: "24-hour risk forecast per user",
  },
];

/* ── Metrics (live from API) ── */
interface Metrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
  confusion_matrix: number[][];
  confusion_matrix_display: {
    true_negatives: number;
    false_positives: number;
    false_negatives: number;
    true_positives: number;
  };
}

const AIModelsAndMetrics = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/metrics")
      .then((r) => r.json())
      .then((d) => { setMetrics(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const metricCards = metrics
    ? [
        { label: "Accuracy", value: metrics.accuracy, color: "hsl(190,95%,55%)" },
        { label: "Precision", value: metrics.precision, color: "hsl(152,70%,48%)" },
        { label: "Recall", value: metrics.recall, color: "hsl(38,92%,55%)" },
        { label: "F1-Score", value: metrics.f1_score, color: "hsl(260,70%,60%)" },
        { label: "ROC-AUC", value: metrics.roc_auc, color: "hsl(0,72%,55%)" },
      ]
    : [];

  const cm = metrics?.confusion_matrix_display;

  return (
    <section id="ai-models-metrics" className="py-24 md:py-32 border-t border-white/[0.04]">
      <div className="section-container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            AI <span className="gradient-text">Models</span> & Performance
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Ensemble of specialized models with live evaluation metrics.
          </p>
        </motion.div>

        {/* Model architecture cards */}
        <div className="grid md:grid-cols-2 gap-5 mb-12">
          {models.map((m, i) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="glass-card-hover p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-accent/10 text-accent">
                  <m.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{m.name}</h3>
                  <span className="text-xs text-primary font-mono">{m.purpose}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{m.why}</p>
              <div className="text-xs font-mono text-foreground/60 bg-secondary/30 px-3 py-2 rounded-lg">
                Output → {m.output}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Performance metrics */}
        {loading ? (
          <div className="flex justify-center items-center min-h-[200px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : metrics ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {metricCards.map((m, i) => (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  className="glass-card p-5 text-center"
                >
                  <div className="text-2xl font-bold font-mono" style={{ color: m.color }}>
                    {(m.value * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{m.label}</div>
                  <div className="mt-2 h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${m.value * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className="h-full rounded-full"
                      style={{ background: m.color }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Confusion matrix */}
            {cm && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="glass-card p-6 max-w-lg mx-auto"
              >
                <h4 className="text-sm font-semibold mb-4 flex items-center gap-2 justify-center">
                  <Award className="w-4 h-4 text-primary" /> Confusion Matrix
                </h4>
                <div className="grid grid-cols-3 gap-1 text-center text-sm font-mono max-w-xs mx-auto">
                  <div></div>
                  <div className="text-[10px] text-muted-foreground font-semibold py-2">Predicted Normal</div>
                  <div className="text-[10px] text-muted-foreground font-semibold py-2">Predicted Fraud</div>

                  <div className="text-[10px] text-muted-foreground font-semibold flex items-center justify-end pr-2">Actual Normal</div>
                  <div className="bg-[hsl(152,70%,48%)]/10 border border-[hsl(152,70%,48%)]/20 rounded-lg p-3">
                    <div className="text-lg font-bold text-[hsl(152,70%,48%)]">{cm.true_negatives.toLocaleString()}</div>
                    <div className="text-[9px] text-muted-foreground">TN</div>
                  </div>
                  <div className="bg-[hsl(38,92%,55%)]/10 border border-[hsl(38,92%,55%)]/20 rounded-lg p-3">
                    <div className="text-lg font-bold text-[hsl(38,92%,55%)]">{cm.false_positives.toLocaleString()}</div>
                    <div className="text-[9px] text-muted-foreground">FP</div>
                  </div>

                  <div className="text-[10px] text-muted-foreground font-semibold flex items-center justify-end pr-2">Actual Fraud</div>
                  <div className="bg-[hsl(0,72%,55%)]/10 border border-[hsl(0,72%,55%)]/20 rounded-lg p-3">
                    <div className="text-lg font-bold text-[hsl(0,72%,55%)]">{cm.false_negatives.toLocaleString()}</div>
                    <div className="text-[9px] text-muted-foreground">FN</div>
                  </div>
                  <div className="bg-[hsl(190,95%,55%)]/10 border border-[hsl(190,95%,55%)]/20 rounded-lg p-3">
                    <div className="text-lg font-bold text-[hsl(190,95%,55%)]">{cm.true_positives.toLocaleString()}</div>
                    <div className="text-[9px] text-muted-foreground">TP</div>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        ) : null}
      </div>
    </section>
  );
};

export default AIModelsAndMetrics;
