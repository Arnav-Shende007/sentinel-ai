import { useEffect, useRef } from "react";
import { toast } from "sonner";

const senders = [
  "UPI-***481", "UPI-***928", "UPI-***337", "UPI-***662", "UPI-***194",
  "UPI-***773", "UPI-***505", "UPI-***812", "UPI-***149", "UPI-***256",
];
const receivers = [
  "UPI-***104", "UPI-***339", "UPI-***881", "UPI-***215", "UPI-***476",
  "UPI-***708", "UPI-***963", "UPI-***527", "UPI-***690", "UPI-***842",
];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const generateAlert = () => {
  const isHighRisk = Math.random() > 0.55;
  const riskScore = isHighRisk
    ? Math.floor(75 + Math.random() * 25) // 75-99
    : Math.floor(5 + Math.random() * 30); // 5-34
  const amount = isHighRisk
    ? Math.floor(8000 + Math.random() * 42000)  // ₹8,000 - ₹50,000
    : Math.floor(50 + Math.random() * 2000);    // ₹50 - ₹2,050

  return {
    isHighRisk,
    riskScore,
    amount,
    sender: pick(senders),
    receiver: pick(receivers),
    decision: isHighRisk ? "Blocked" : "Approved",
  };
};

const LiveAlertToasts = () => {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Start after a brief delay so the page loads first
    const startDelay = setTimeout(() => {
      const fireAlert = () => {
        const alert = generateAlert();

        if (alert.isHighRisk) {
          toast.error(
            `🚨 High Risk (${alert.riskScore}) ${alert.decision}`,
            {
              description: `${alert.sender} → ${alert.receiver}  ·  ₹${alert.amount.toLocaleString("en-IN")}`,
              duration: 5000,
              style: {
                background: "hsl(222, 40%, 10%)",
                border: "1px solid hsl(0, 72%, 55%, 0.3)",
                color: "hsl(210, 40%, 96%)",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "12px",
              },
            }
          );
        } else {
          toast.success(
            `✅ Low Risk (${alert.riskScore}) ${alert.decision}`,
            {
              description: `${alert.sender} → ${alert.receiver}  ·  ₹${alert.amount.toLocaleString("en-IN")}`,
              duration: 4000,
              style: {
                background: "hsl(222, 40%, 10%)",
                border: "1px solid hsl(152, 70%, 48%, 0.3)",
                color: "hsl(210, 40%, 96%)",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "12px",
              },
            }
          );
        }
      };

      // Fire first toast quickly
      fireAlert();

      // Then every 7-12 seconds (random interval)
      const tick = () => {
        fireAlert();
        const next = 7000 + Math.random() * 5000;
        intervalRef.current = setTimeout(tick, next);
      };
      intervalRef.current = setTimeout(tick, 7000 + Math.random() * 5000);
    }, 3000);

    return () => {
      clearTimeout(startDelay);
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, []);

  return null; // Headless component
};

export default LiveAlertToasts;
