import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Loader2, ShieldAlert, CheckCircle2, Zap, BarChart3, Clock, XCircle, FileText, Download, X } from "lucide-react";

interface BlockedTransaction {
  transaction_id: string;
  sender: string;
  receiver: string;
  amount: number;
  risk_score: number;
  anomaly_score: number;
  reason: string;
  decision: string;
}

interface BatchResult {
  total_processed: number;
  total_blocked: number;
  pass_rate: number;
  blocked_transactions: BlockedTransaction[];
}

const SCAN_STEPS = [
  { icon: "📂", label: "Loading CSV batch data...", done: "Batch data loaded" },
  { icon: "🔧", label: "Extracting transaction features...", done: "Features extracted" },
  { icon: "🧠", label: "Running XGBoost scoring engine...", done: "Risk scores computed" },
  { icon: "📊", label: "Analyzing behavioral anomalies...", done: "Anomalies flagged" },
  { icon: "🛡️", label: "Generating compliance report...", done: "Report ready" },
];

const STEP_DELAY = 500;

const EXPECTED_COLUMNS = [
  { name: "sender_id", required: true },
  { name: "receiver_id", required: true },
  { name: "amount", required: true },
  { name: "hour", required: false },
  { name: "day_of_week", required: false },
  { name: "device_changed", required: false },
  { name: "is_new_recipient", required: false },
  { name: "txn_lat", required: false },
  { name: "txn_lon", required: false },
  { name: "sender_home_lat", required: false },
  { name: "sender_home_lon", required: false },
];

const BatchProcessing = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(-1);
  const [processedCount, setProcessedCount] = useState(0);
  const pendingResult = useRef<BatchResult | null>(null);
  const animationDone = useRef(false);

  // CSV file upload state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalCount = csvFile ? 0 : 500; // for CSV uploads we don't know count upfront
  const [displayTotal, setDisplayTotal] = useState(500);

  // Drive step-by-step animation
  useEffect(() => {
    if (!loading) return;
    setActiveStep(0);
    setProcessedCount(0);
    animationDone.current = false;

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Step progression
    SCAN_STEPS.forEach((_, i) => {
      if (i === 0) return;
      timers.push(setTimeout(() => setActiveStep(i), STEP_DELAY * i));
    });

    // Counter animation
    const target = displayTotal || 500;
    const counterInterval = setInterval(() => {
      setProcessedCount((prev) => {
        const next = prev + Math.floor(Math.random() * 30 + 15);
        return next >= target ? target : next;
      });
    }, 60);
    timers.push(setTimeout(() => clearInterval(counterInterval), STEP_DELAY * SCAN_STEPS.length) as unknown as ReturnType<typeof setTimeout>);

    // Mark animation complete
    timers.push(
      setTimeout(() => {
        animationDone.current = true;
        setProcessedCount(target);
        if (pendingResult.current) {
          setResult(pendingResult.current);
          setDisplayTotal(pendingResult.current.total_processed);
          setProcessedCount(pendingResult.current.total_processed);
          pendingResult.current = null;
          setLoading(false);
        }
      }, STEP_DELAY * SCAN_STEPS.length)
    );

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(counterInterval);
    };
  }, [loading, displayTotal]);

  // CSV upload scan
  const handleCsvScan = useCallback(async () => {
    if (!csvFile) return;
    setLoading(true);
    setResult(null);
    setError(null);
    pendingResult.current = null;
    animationDone.current = false;

    try {
      const formData = new FormData();
      formData.append("file", csvFile);

      const res = await fetch("/api/batch-scan-csv", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(errData.detail || "API Error");
      }

      const data = await res.json();
      setDisplayTotal(data.total_processed);

      if (animationDone.current) {
        setResult(data);
        setProcessedCount(data.total_processed);
        setLoading(false);
      } else {
        pendingResult.current = data;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not reach AI engine.";
      setError(msg);
      setLoading(false);
    }
  }, [csvFile]);

  // Simulated scan (existing behavior)
  const handleSimulatedScan = useCallback(async () => {
    setDisplayTotal(500);
    setLoading(true);
    setResult(null);
    setError(null);
    pendingResult.current = null;
    animationDone.current = false;

    try {
      const res = await fetch("/api/batch-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 500 }),
      });
      if (!res.ok) throw new Error("API Error");
      const data = await res.json();

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
  }, []);

  // Drag-and-drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].name.toLowerCase().endsWith(".csv")) {
      setCsvFile(files[0]);
      setResult(null);
      setError(null);
    } else {
      setError("Please drop a valid .csv file.");
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setCsvFile(files[0]);
      setResult(null);
      setError(null);
    }
  }, []);

  const clearFile = useCallback(() => {
    setCsvFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  return (
    <section id="batch-scan" className="py-24 md:py-32 border-t border-white/[0.04]">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Bulk CSV <span className="gradient-text">Scanner</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Upload your transaction CSV or run a simulated batch — the AI engine scores
            every row through XGBoost + behavioral profiling in real time.
          </p>
        </motion.div>

        {/* CSV Drop Zone */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-2xl mx-auto mb-8"
        >
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !loading && fileInputRef.current?.click()}
            className={`relative rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer group ${
              isDragOver
                ? "border-primary bg-primary/[0.06] shadow-[0_0_30px_hsl(190,95%,55%,0.1)]"
                : csvFile
                ? "border-[hsl(152,70%,48%)]/40 bg-[hsl(152,70%,48%)]/[0.04]"
                : "border-white/[0.08] bg-secondary/20 hover:border-primary/30 hover:bg-primary/[0.02]"
            } ${loading ? "pointer-events-none opacity-60" : ""}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />

            {csvFile ? (
              <div className="flex items-center gap-4 p-5">
                <div className="w-10 h-10 rounded-lg bg-[hsl(152,70%,48%)]/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-[hsl(152,70%,48%)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{csvFile.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(csvFile.size / 1024).toFixed(1)} KB — Ready to scan
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); clearFile(); }}
                  className="p-1.5 rounded-md hover:bg-white/[0.06] transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 p-8">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  isDragOver
                    ? "bg-primary/20 scale-110"
                    : "bg-secondary/40 group-hover:bg-primary/10"
                }`}>
                  <Upload className={`w-6 h-6 transition-colors duration-300 ${
                    isDragOver ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                  }`} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium mb-1">
                    {isDragOver ? "Drop your CSV here" : "Drag & drop your CSV file here"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    or click to browse · Max 5,000 rows
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Expected columns helper + Download sample */}
          <div className="flex items-start justify-between mt-3 gap-4">
            <div className="text-[10px] text-muted-foreground/60 leading-relaxed flex-1">
              <span className="font-semibold text-muted-foreground/80">Required:</span>{" "}
              {EXPECTED_COLUMNS.filter(c => c.required).map(c => c.name).join(", ")}
              <span className="mx-1.5">·</span>
              <span className="font-semibold text-muted-foreground/80">Optional:</span>{" "}
              {EXPECTED_COLUMNS.filter(c => !c.required).map(c => c.name).join(", ")}
            </div>
            <a
              href="/sample_transactions.csv"
              download="sample_transactions.csv"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-[10px] text-primary hover:text-primary/80 font-semibold transition-colors flex-shrink-0 mt-0.5"
            >
              <Download className="w-3 h-3" /> Download Sample CSV
            </a>
          </div>
        </motion.div>

        {/* Action buttons */}
        <div className="flex justify-center gap-3 mb-8">
          <button
            onClick={csvFile ? handleCsvScan : handleSimulatedScan}
            disabled={loading}
            className="btn-primary text-sm px-8 py-3 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Processing Batch...
              </>
            ) : csvFile ? (
              <>
                <Zap className="w-4 h-4" /> Scan Uploaded CSV
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Run Simulated Batch (500 Txns)
              </>
            )}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card p-6 max-w-2xl mx-auto"
            >
              {/* Progress bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-muted-foreground">
                    {csvFile ? `Scoring ${csvFile.name}...` : "Processing transactions..."}
                  </span>
                  <span className="text-xs font-mono text-primary font-bold">
                    {csvFile ? (processedCount > 0 ? `${processedCount} rows` : "...") : `${processedCount}/${displayTotal}`}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-secondary/50 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-primary via-[hsl(260,70%,60%)] to-primary"
                    style={{ backgroundSize: "200% 100%" }}
                    animate={{
                      width: csvFile ? `${((activeStep + 1) / SCAN_STEPS.length) * 100}%` : `${(processedCount / (displayTotal || 500)) * 100}%`,
                      backgroundPosition: ["0% 0%", "100% 0%"],
                    }}
                    transition={{
                      width: { duration: 0.3 },
                      backgroundPosition: { duration: 1.5, repeat: Infinity, ease: "linear" },
                    }}
                  />
                </div>
              </div>

              {/* Steps */}
              <div className="flex flex-col gap-2">
                {SCAN_STEPS.map((step, i) => {
                  const isActive = i === activeStep;
                  const isDone = i < activeStep;
                  const isPending = i > activeStep;
                  return (
                    <motion.div
                      key={step.label}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: isPending ? 0.3 : 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.35 }}
                      className={`flex items-center gap-3 px-4 py-2 rounded-lg border transition-all duration-500 ${
                        isActive
                          ? "bg-primary/10 border-primary/30 shadow-[0_0_15px_hsl(190,95%,55%,0.1)]"
                          : isDone
                          ? "bg-[hsl(152,70%,48%)]/5 border-[hsl(152,70%,48%)]/20"
                          : "bg-secondary/20 border-white/[0.04]"
                      }`}
                    >
                      <span className="text-base flex-shrink-0">{isDone ? "✅" : step.icon}</span>
                      <span
                        className={`text-xs font-mono flex-1 ${
                          isActive ? "text-primary" : isDone ? "text-[hsl(152,70%,48%)]" : "text-muted-foreground"
                        }`}
                      >
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
              </div>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-6 max-w-2xl mx-auto text-center text-destructive text-sm"
            >
              {error}
            </motion.div>
          ) : result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { icon: Zap, label: "Total Processed", value: result.total_processed, color: "text-primary" },
                  { icon: ShieldAlert, label: "Blocked / Flagged", value: result.total_blocked, color: "text-[hsl(0,72%,55%)]" },
                  { icon: CheckCircle2, label: "Pass Rate", value: `${result.pass_rate}%`, color: "text-[hsl(152,70%,48%)]" },
                  { icon: Clock, label: "Avg Time", value: "<2ms", color: "text-[hsl(38,92%,55%)]" },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-card p-5"
                  >
                    <s.icon className={`w-5 h-5 ${s.color} mb-3`} />
                    <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                  </motion.div>
                ))}
              </div>

              {/* Blocked transactions table */}
              {result.blocked_transactions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="glass-card p-5 overflow-x-auto"
                >
                  <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-[hsl(0,72%,55%)]" />
                    Blocked Transactions ({result.total_blocked})
                  </h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b border-white/[0.06]">
                        <th className="text-left py-2 font-medium">Transaction ID</th>
                        <th className="text-left py-2 font-medium">Sender → Receiver</th>
                        <th className="text-left py-2 font-medium">Amount</th>
                        <th className="text-left py-2 font-medium">Risk</th>
                        <th className="text-left py-2 font-medium">Reason</th>
                        <th className="text-left py-2 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.blocked_transactions.map((txn, i) => (
                        <motion.tr
                          key={txn.transaction_id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + i * 0.03 }}
                          className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${
                            txn.risk_score >= 90
                              ? "bg-[hsl(0,72%,55%)]/[0.04]"
                              : ""
                          }`}
                        >
                          <td className="py-2.5 font-mono text-xs">{txn.transaction_id}</td>
                          <td className="py-2.5 text-xs">
                            <span className="font-mono">{txn.sender}</span>
                            <span className="text-muted-foreground mx-1">→</span>
                            <span className="font-mono">{txn.receiver}</span>
                          </td>
                          <td className="py-2.5 font-mono text-xs">₹{txn.amount.toLocaleString()}</td>
                          <td className="py-2.5">
                            <span
                              className={`font-mono font-bold text-xs ${
                                txn.risk_score >= 90
                                  ? "text-[hsl(0,72%,55%)]"
                                  : txn.risk_score >= 80
                                  ? "text-[hsl(0,72%,55%)]"
                                  : "text-[hsl(38,92%,55%)]"
                              }`}
                            >
                              {txn.risk_score}
                            </span>
                          </td>
                          <td className="py-2.5 text-xs text-muted-foreground max-w-[250px] truncate">
                            {txn.reason}
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                txn.decision === "BLOCK"
                                  ? "bg-destructive/20 text-destructive border border-destructive/20"
                                  : "bg-[hsl(38,92%,55%)]/20 text-[hsl(38,92%,55%)] border border-[hsl(38,92%,55%)]/20"
                              }`}
                            >
                              {txn.decision}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-12 max-w-2xl mx-auto text-center"
            >
              <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">
                Drop a CSV above or click "Run Simulated Batch" to process transactions through the AI pipeline.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default BatchProcessing;
