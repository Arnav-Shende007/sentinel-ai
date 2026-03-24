import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Mail, MessageSquare, CheckCircle2, AlertTriangle, FileBarChart } from "lucide-react";
import ComplianceReportModal from "./ComplianceReportModal";

interface Alert {
  id: string;
  transaction_id: string;
  sender: string;
  receiver: string;
  amount: string;
  severity: string;
  status: string;
  description: string;
}

const alertChannels = [
  { icon: MessageSquare, label: "SMS Alert", channel: "SMS" },
  { icon: Mail, label: "Email Alert", channel: "Email" },
  { icon: Bell, label: "Dashboard Alert", channel: "Push" },
];

const Alerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState<string[]>([]);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    fetch("/api/alerts").then((r) => r.json()).then((d) => { setAlerts(d.alerts || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleSend = (channel: string) => {
    setSent((p) => [...p, channel]);
    setTimeout(() => setSent((p) => p.filter((c) => c !== channel)), 3000);
  };

  return (
    <section className="py-24 md:py-32 border-t border-white/[0.04]">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Alert & <span className="gradient-text">Notification</span> System</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">Multi-channel real-time alerts for instant fraud response.</p>
        </motion.div>

        {/* Alert channels */}
        <div className="grid md:grid-cols-3 gap-5 max-w-3xl mx-auto mb-10">
          {alertChannels.map((a, i) => {
            const latestAlert = alerts[i];
            return (
              <motion.div key={a.channel} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.6 }} className="glass-card p-6 text-center">
                <div className="p-3 rounded-lg bg-primary/10 text-primary w-fit mx-auto mb-4"><a.icon className="w-6 h-6" /></div>
                <h4 className="font-semibold mb-2">{a.label}</h4>
                <p className="text-xs text-muted-foreground mb-4">
                  {latestAlert ? `⚠️ ${latestAlert.description.slice(0, 60)}...` : "No recent alerts"}
                </p>
                <button onClick={() => handleSend(a.channel)} disabled={sent.includes(a.channel)} className="btn-outline text-xs px-4 py-2 w-full disabled:opacity-50">
                  <AnimatePresence mode="wait">
                    {sent.includes(a.channel) ? (
                      <motion.span key="sent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-1.5 text-[hsl(152,70%,48%)]"><CheckCircle2 className="w-3.5 h-3.5" /> Sent!</motion.span>
                    ) : (
                      <motion.span key="send" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Simulate {a.channel}</motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Alert log table */}
        {!loading && alerts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="glass-card p-5 overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[hsl(38,92%,55%)]" /> Recent Fraud Alerts ({alerts.length})
              </h4>
              <button
                onClick={() => setReportOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all duration-200"
              >
                <FileBarChart className="w-3.5 h-3.5" /> Export Compliance Report
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-white/[0.06]">
                  <th className="text-left py-2 font-medium">Alert ID</th>
                  <th className="text-left py-2 font-medium">Sender → Receiver</th>
                  <th className="text-left py-2 font-medium">Amount</th>
                  <th className="text-left py-2 font-medium">Severity</th>
                  <th className="text-left py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {alerts.slice(0, 6).map((a) => (
                  <tr key={a.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 font-mono text-xs">{a.id}</td>
                    <td className="py-2.5 text-xs">{a.sender} → {a.receiver}</td>
                    <td className="py-2.5 font-mono text-xs">{a.amount}</td>
                    <td className="py-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${a.severity === "CRITICAL" ? "bg-destructive/20 text-destructive" : "bg-[hsl(38,92%,55%)]/20 text-[hsl(38,92%,55%)]"}`}>{a.severity}</span>
                    </td>
                    <td className="py-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.status === "Blocked" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>{a.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {/* Compliance Report Modal */}
        <ComplianceReportModal open={reportOpen} onClose={() => setReportOpen(false)} alerts={alerts} />
      </div>
    </section>
  );
};

export default Alerts;
