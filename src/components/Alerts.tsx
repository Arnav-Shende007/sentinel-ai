import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Mail, MessageSquare, CheckCircle2, AlertTriangle,
  FileBarChart, ShieldAlert, ArrowRight, Zap, MapPin,
  Clock, Smartphone, UserX, TrendingUp, ChevronRight
} from "lucide-react";
import ComplianceReportModal from "./ComplianceReportModal";

interface AITrigger {
  factor: string;
  detail: string;
  severity: string;
}

interface ActionTaken {
  action: string;
  detail: string;
}

interface Alert {
  id: string;
  transaction_id: string;
  sender: string;
  receiver: string;
  amount: string;
  amount_raw: number;
  hour: number;
  geo_distance_km: number;
  severity: string;
  status: string;
  risk_score: number;
  ai_triggers: AITrigger[];
  action_taken: ActionTaken;
  description: string;
  timestamp: string;
}

const triggerIcons: Record<string, React.ElementType> = {
  "High Value": TrendingUp,
  "Elevated Amount": TrendingUp,
  "Off-Hours Activity": Clock,
  "Late Night Transaction": Clock,
  "Geo Displacement": MapPin,
  "Location Shift": MapPin,
  "Device Mismatch": Smartphone,
  "New Beneficiary": UserX,
  "Pattern Match": Zap,
};

const severityColors: Record<string, string> = {
  critical: "text-red-400",
  high: "text-amber-400",
  medium: "text-sky-400",
};

const severityBorderColors: Record<string, string> = {
  critical: "border-red-500/30",
  high: "border-amber-500/30",
  medium: "border-sky-500/30",
};

const alertChannels = [
  { icon: MessageSquare, label: "SMS", channel: "SMS", color: "hsl(152,70%,48%)" },
  { icon: Mail, label: "Email", channel: "Email", color: "hsl(190,95%,55%)" },
  { icon: Bell, label: "Push", channel: "Push", color: "hsl(38,92%,55%)" },
];

const Alerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sent, setSent] = useState<string[]>([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "CRITICAL" | "HIGH">("ALL");

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((d) => {
        const a = d.alerts || [];
        setAlerts(a);
        if (a.length > 0) setSelectedId(a[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSend = (channel: string) => {
    setSent((p) => [...p, channel]);
    setTimeout(() => setSent((p) => p.filter((c) => c !== channel)), 3000);
  };

  const selected = alerts.find((a) => a.id === selectedId) || null;
  const filtered = filter === "ALL" ? alerts : alerts.filter((a) => a.severity === filter);

  if (loading) {
    return (
      <section id="alerts" className="py-24 md:py-32 border-t border-white/[0.04]">
        <div className="section-container text-center">
          <div className="animate-pulse text-muted-foreground">Loading threat intelligence...</div>
        </div>
      </section>
    );
  }

  return (
    <section id="alerts" className="py-24 md:py-32 border-t border-white/[0.04]">
      <div className="section-container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Active Threat <span className="gradient-text">Triage</span> Terminal
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            AI-prioritized alerts with deep explainability and automated response dispatch.
          </p>
        </motion.div>

        {/* Main Split-Pane */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid lg:grid-cols-[340px_1fr] gap-5"
        >
          {/* LEFT: Alert Inbox */}
          <div className="glass-card p-0 overflow-hidden flex flex-col" style={{ maxHeight: "620px" }}>
            {/* Inbox Header */}
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between shrink-0">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                Threat Inbox
                <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-bold">
                  {alerts.length}
                </span>
              </h4>
              <div className="flex gap-1">
                {(["ALL", "CRITICAL", "HIGH"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition-all ${
                      filter === f
                        ? "bg-primary/20 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Inbox List */}
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              {filtered.map((a, i) => (
                <motion.button
                  key={a.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSelectedId(a.id)}
                  className={`w-full text-left p-3.5 border-b border-white/[0.03] transition-all flex items-start gap-3 group ${
                    selectedId === a.id
                      ? "bg-primary/[0.08] border-l-2 border-l-primary"
                      : "hover:bg-white/[0.03] border-l-2 border-l-transparent"
                  }`}
                >
                  {/* Severity Pulse */}
                  <div className="shrink-0 mt-1">
                    <span
                      className={`block w-2.5 h-2.5 rounded-full ${
                        a.severity === "CRITICAL"
                          ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                          : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                      }`}
                      style={{
                        animation: a.severity === "CRITICAL" ? "pulse 2s infinite" : "none",
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold truncate">
                        {a.amount}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Risk {a.risk_score}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mb-1">
                      {a.sender.split("@")[0]}…@{a.sender.split("@")[1] || ""} →{" "}
                      {a.receiver.split("@")[0]}…
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {a.ai_triggers.slice(0, 2).map((t, ti) => (
                        <span
                          key={ti}
                          className={`text-[9px] px-1.5 py-0.5 rounded border ${severityBorderColors[t.severity]} ${severityColors[t.severity]} bg-white/[0.02]`}
                        >
                          {t.factor}
                        </span>
                      ))}
                      {a.ai_triggers.length > 2 && (
                        <span className="text-[9px] text-muted-foreground">
                          +{a.ai_triggers.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-3.5 h-3.5 shrink-0 mt-2 transition-transform ${
                      selectedId === a.id ? "text-primary" : "text-muted-foreground opacity-0 group-hover:opacity-100"
                    }`}
                  />
                </motion.button>
              ))}
            </div>
          </div>

          {/* RIGHT: Investigation Detail Pane */}
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="glass-card p-0 overflow-hidden flex flex-col"
                style={{ maxHeight: "620px" }}
              >
                {/* Detail Header */}
                <div className="p-5 border-b border-white/[0.06] shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                          selected.severity === "CRITICAL"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {selected.severity}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">{selected.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${selected.status === "Blocked" ? "bg-red-500/10 text-red-400" : "bg-primary/10 text-primary"}`}>
                        {selected.status}
                      </span>
                      <button
                        onClick={() => setReportOpen(true)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all"
                      >
                        <FileBarChart className="w-3 h-3" /> Report
                      </button>
                    </div>
                  </div>

                  {/* Transaction Flow Visual */}
                  <div className="flex items-center gap-3 bg-black/30 rounded-xl p-4 border border-white/[0.04]">
                    <div className="flex-1 text-center">
                      <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider">Sender</p>
                      <p className="text-xs font-mono font-semibold truncate">{selected.sender}</p>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 shrink-0">
                      <span className="text-sm font-bold text-red-400">{selected.amount}</span>
                      <ArrowRight className="w-4 h-4 text-red-400" />
                      <span className="text-[9px] text-muted-foreground">{selected.hour}:00</span>
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider">Receiver</p>
                      <p className="text-xs font-mono font-semibold truncate">{selected.receiver}</p>
                    </div>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                  {/* Risk Score Bar */}
                  <div className="px-5 pt-4 pb-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">AI Risk Score</span>
                      <span className={`text-lg font-bold font-mono ${selected.risk_score >= 80 ? "text-red-400" : "text-amber-400"}`}>
                        {selected.risk_score}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${selected.risk_score}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{
                          background: selected.risk_score >= 80
                            ? "linear-gradient(90deg, hsl(0,72%,55%), hsl(0,72%,45%))"
                            : "linear-gradient(90deg, hsl(38,92%,55%), hsl(25,90%,50%))",
                          boxShadow: selected.risk_score >= 80
                            ? "0 0 12px rgba(239,68,68,0.4)"
                            : "0 0 12px rgba(245,158,11,0.3)",
                        }}
                      />
                    </div>
                  </div>

                  {/* AI Reasoning Triggers */}
                  <div className="px-5 py-3">
                    <h5 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" /> Why AI Flagged This
                    </h5>
                    <div className="space-y-2">
                      {selected.ai_triggers.map((trigger, ti) => {
                        const Icon = triggerIcons[trigger.factor] || AlertTriangle;
                        return (
                          <motion.div
                            key={ti}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: ti * 0.08 }}
                            className={`flex items-start gap-3 p-3 rounded-lg border bg-white/[0.02] ${severityBorderColors[trigger.severity]}`}
                          >
                            <div className={`shrink-0 p-1.5 rounded-md bg-white/[0.04] ${severityColors[trigger.severity]}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <p className={`text-xs font-semibold mb-0.5 ${severityColors[trigger.severity]}`}>
                                {trigger.factor}
                              </p>
                              <p className="text-[11px] text-muted-foreground leading-relaxed">
                                {trigger.detail}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action Taken */}
                  <div className="px-5 py-3">
                    <h5 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-primary" /> Automated Response
                    </h5>
                    <div className="p-3 rounded-lg border border-primary/20 bg-primary/[0.04]">
                      <p className="text-xs font-semibold text-primary mb-1">{selected.action_taken.action}</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{selected.action_taken.detail}</p>
                    </div>
                  </div>

                  {/* Action Dispatcher */}
                  <div className="px-5 py-4 border-t border-white/[0.04]">
                    <h5 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Dispatch Alert
                    </h5>
                    <div className="grid grid-cols-3 gap-2">
                      {alertChannels.map((ch) => (
                        <button
                          key={ch.channel}
                          onClick={() => handleSend(ch.channel)}
                          disabled={sent.includes(ch.channel)}
                          className="py-2.5 px-2 rounded-lg text-[11px] font-semibold border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1.5"
                        >
                          <AnimatePresence mode="wait">
                            {sent.includes(ch.channel) ? (
                              <motion.div
                                key="sent"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex flex-col items-center gap-1"
                              >
                                <CheckCircle2 className="w-4 h-4" style={{ color: ch.color }} />
                                <span style={{ color: ch.color }}>Sent!</span>
                              </motion.div>
                            ) : (
                              <motion.div
                                key="send"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center gap-1"
                              >
                                <ch.icon className="w-4 h-4 text-muted-foreground" />
                                <span>{ch.label}</span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="glass-card p-12 flex items-center justify-center text-muted-foreground text-sm">
                Select an alert from the inbox to begin investigation.
              </div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Compliance Report Modal */}
        <ComplianceReportModal open={reportOpen} onClose={() => setReportOpen(false)} alerts={alerts} />
      </div>

      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
      `}</style>
    </section>
  );
};

export default Alerts;
