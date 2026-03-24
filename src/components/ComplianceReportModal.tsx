import { motion, AnimatePresence } from "framer-motion";
import { X, Printer, Shield, AlertTriangle, FileText } from "lucide-react";

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

interface Props {
  open: boolean;
  onClose: () => void;
  alerts: Alert[];
}

const ComplianceReportModal = ({ open, onClose, alerts }: Props) => {
  const reportId = `SAR-${Date.now().toString(36).toUpperCase()}`;
  const reportDate = new Date().toLocaleDateString("en-IN", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const criticalAlerts = alerts.filter(a => a.severity === "CRITICAL");
  const highAlerts = alerts.filter(a => a.severity === "HIGH");

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[720px] md:max-h-[85vh] bg-[hsl(222,40%,8%)] border border-white/[0.08] rounded-2xl z-50 overflow-auto shadow-2xl"
            id="compliance-report-modal"
          >
            {/* Header */}
            <div className="sticky top-0 bg-[hsl(222,40%,8%)]/95 backdrop-blur-sm border-b border-white/[0.06] px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[hsl(0,72%,55%)]/10">
                  <Shield className="w-5 h-5 text-[hsl(0,72%,55%)]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Suspicious Activity Report (SAR)</h3>
                  <p className="text-[10px] text-muted-foreground font-mono">{reportId}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handlePrint} className="btn-primary text-xs px-3 py-1.5 print:hidden">
                  <Printer className="w-3.5 h-3.5" /> Print Report
                </button>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors print:hidden">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Report metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/30 rounded-lg p-3 border border-white/[0.04]">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Report ID</div>
                  <div className="text-sm font-mono font-bold">{reportId}</div>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3 border border-white/[0.04]">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Generated</div>
                  <div className="text-sm font-mono">{reportDate}</div>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3 border border-white/[0.04]">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Institution</div>
                  <div className="text-sm">Sentinel AI — Fraud Intelligence Unit</div>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3 border border-white/[0.04]">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Filing Type</div>
                  <div className="text-sm">Automated SAR — Real-time Detection</div>
                </div>
              </div>

              {/* Risk summary */}
              <div className="bg-[hsl(0,72%,55%)]/5 border border-[hsl(0,72%,55%)]/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-[hsl(0,72%,55%)]" />
                  <h4 className="text-sm font-bold text-[hsl(0,72%,55%)]">Risk Summary</h4>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold font-mono text-[hsl(0,72%,55%)]">{criticalAlerts.length}</div>
                    <div className="text-[10px] text-muted-foreground">CRITICAL</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold font-mono text-[hsl(38,92%,55%)]">{highAlerts.length}</div>
                    <div className="text-[10px] text-muted-foreground">HIGH</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold font-mono text-foreground">{alerts.length}</div>
                    <div className="text-[10px] text-muted-foreground">TOTAL ALERTS</div>
                  </div>
                </div>
              </div>

              {/* Alert table */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-bold">Flagged Transactions</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] text-muted-foreground border-b border-white/[0.06] uppercase tracking-wider">
                        <th className="text-left py-2 font-medium">Alert ID</th>
                        <th className="text-left py-2 font-medium">Parties</th>
                        <th className="text-left py-2 font-medium">Amount</th>
                        <th className="text-left py-2 font-medium">Severity</th>
                        <th className="text-left py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alerts.map((a) => (
                        <tr key={a.id} className="border-b border-white/[0.03]">
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
                </div>
              </div>

              {/* Recommendation */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <h4 className="text-sm font-bold text-primary mb-2">Recommended Actions</h4>
                <ul className="text-xs text-foreground/70 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">●</span>
                    Escalate CRITICAL alerts to Compliance Officer within 24 hours per RBI guidelines
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">●</span>
                    Freeze flagged accounts pending manual review of transaction patterns
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">●</span>
                    File STR (Suspicious Transaction Report) with FIU-IND for transactions exceeding ₹10,00,000
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">●</span>
                    Notify NPCI for UPI-specific fraud ring coordination across multiple PSPs
                  </li>
                </ul>
              </div>

              {/* Footer */}
              <div className="text-center pt-4 border-t border-white/[0.06]">
                <p className="text-[10px] text-muted-foreground">
                  This report was auto-generated by Sentinel AI Fraud Intelligence Platform.
                  <br />Classification: CONFIDENTIAL · For authorized compliance personnel only.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ComplianceReportModal;
