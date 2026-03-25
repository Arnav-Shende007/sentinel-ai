import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { ShieldAlert, ShieldCheck, TrendingDown, Activity, Loader2 } from "lucide-react";

interface DashboardData {
  stats: { total_transactions: number; fraud_detected: number; fraud_prevented: number; false_positive_reduction: number };
  pie_data: { name: string; value: number }[];
  risk_distribution: { range: string; count: number }[];
  time_data: { hour: string; transactions: number; frauds: number }[];
  suspicious_accounts: { id: string; score: number; txns: number; amount: string; flag: string }[];
}

const pieColors = ["hsl(152,70%,48%)", "hsl(38,92%,55%)", "hsl(0,72%,55%)"];

const AnimatedCounter = ({ target, suffix = "" }: { target: number; suffix?: string }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / 40;
    const interval = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(interval); }
      else setVal(Math.floor(start));
    }, 30);
    return () => clearInterval(interval);
  }, [target]);
  return <span>{val.toLocaleString()}{suffix}</span>;
};

const Dashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section id="dashboard" className="py-24 md:py-32 border-t border-white/[0.04]">
        <div className="section-container flex justify-center items-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (!data) return null;

  const statCards = [
    { icon: Activity, label: "Total Transactions", value: data.stats.total_transactions, color: "text-primary" },
    { icon: ShieldAlert, label: "Fraud Detected", value: data.stats.fraud_detected, color: "text-[hsl(0,72%,55%)]" },
    { icon: ShieldCheck, label: "Fraud Prevented", value: data.stats.fraud_prevented, color: "text-[hsl(152,70%,48%)]" },
    { icon: TrendingDown, label: "False Positives Reduced", value: data.stats.false_positive_reduction, suffix: "%", color: "text-[hsl(38,92%,55%)]" },
  ];

  return (
    <section id="dashboard" className="py-24 md:py-32 border-t border-white/[0.04]">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Analytics <span className="gradient-text">Dashboard</span></h2>
          <p className="text-muted-foreground max-w-lg mx-auto">Real-time monitoring and analytics across all UPI transactions.</p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }} className="glass-card p-5">
              <s.icon className={`w-5 h-5 ${s.color} mb-3`} />
              <div className={`text-2xl font-bold font-mono ${s.color}`}><AnimatedCounter target={s.value} suffix={s.suffix} /></div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="glass-card p-5">
            <h4 className="text-sm font-semibold mb-4">Transaction Distribution</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data.pie_data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {data.pie_data.map((_, i) => (<Cell key={i} fill={pieColors[i]} stroke="transparent" />))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(222,40%,10%)", border: "1px solid hsl(222,30%,20%)", borderRadius: 8, fontSize: 12 }} itemStyle={{ color: "hsl(210,40%,96%)" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {data.pie_data.map((d, i) => (
                <span key={d.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="w-2 h-2 rounded-full" style={{ background: pieColors[i] }} />{d.name} ({d.value}%)
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }} className="glass-card p-5">
            <h4 className="text-sm font-semibold mb-4">Risk Score Distribution</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.risk_distribution} margin={{ top: 10, right: 10, left: 10, bottom: 15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,30%,16%)" />
                <XAxis dataKey="range" tick={{ fontSize: 10, fill: "hsl(215,20%,55%)" }} label={{ value: "Risk Score Range", position: "insideBottom", offset: -10, fill: "hsl(215,20%,55%)", fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(215,20%,55%)" }} label={{ value: "Txn Count", angle: -90, position: "insideLeft", fill: "hsl(215,20%,55%)", fontSize: 11, style: { textAnchor: 'middle' } }} />
                <Tooltip contentStyle={{ background: "hsl(222,40%,10%)", border: "1px solid hsl(222,30%,20%)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="hsl(190,95%,55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }} className="glass-card p-5">
            <h4 className="text-sm font-semibold mb-4">Transactions & Fraud Over Time</h4>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.time_data} margin={{ top: 10, right: 10, left: 0, bottom: 15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,30%,16%)" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "hsl(215,20%,55%)" }} interval={3} label={{ value: "Time of Day (Hours)", position: "insideBottom", offset: -10, fill: "hsl(215,20%,55%)", fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(215,20%,55%)" }} label={{ value: "Volume", angle: -90, position: "insideLeft", fill: "hsl(215,20%,55%)", fontSize: 11, style: { textAnchor: 'middle' } }} />
                <Tooltip contentStyle={{ background: "hsl(222,40%,10%)", border: "1px solid hsl(222,30%,20%)", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="transactions" stroke="hsl(190,95%,55%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="frauds" stroke="hsl(0,72%,55%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="glass-card p-5 overflow-x-auto">
          <h4 className="text-sm font-semibold mb-4">Top Suspicious Accounts</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-white/[0.06]">
                <th className="text-left py-2 font-medium">Account ID</th>
                <th className="text-left py-2 font-medium">Risk Score</th>
                <th className="text-left py-2 font-medium">Transactions</th>
                <th className="text-left py-2 font-medium">Volume</th>
                <th className="text-left py-2 font-medium">Flag</th>
              </tr>
            </thead>
            <tbody>
              {data.suspicious_accounts.map((a) => (
                <tr key={a.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 font-mono text-xs">{a.id}</td>
                  <td className="py-2.5"><span className={`font-mono font-bold ${a.score >= 80 ? "text-[hsl(0,72%,55%)]" : "text-[hsl(38,92%,55%)]"}`}>{a.score}</span></td>
                  <td className="py-2.5 font-mono">{a.txns}</td>
                  <td className="py-2.5 font-mono">{a.amount}</td>
                  <td className="py-2.5"><span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">{a.flag}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
};

export default Dashboard;
