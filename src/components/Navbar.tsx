import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Menu, X } from "lucide-react";

const links = [
  { label: "Rules vs AI", href: "#rules-vs-ai" },
  { label: "Batch Scan", href: "#batch-scan" },
  { label: "Fraud Ring", href: "#fraud-network" },
  { label: "Models & Metrics", href: "#ai-models-metrics" },
  { label: "XAI", href: "#explainable-ai" },
  { label: "Prediction", href: "#prediction" },
  { label: "Alerts", href: "#alerts" },
  { label: "Register Complaint", href: "https://cybercrime.gov.in/Default.aspx" },
  { label: "Helpline Number", href: "#" }
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "bg-background/80 backdrop-blur-xl border-b border-white/[0.06]" : ""
        }`}
    >
      <div className="section-container flex items-center justify-between h-16">
        <a href="#" className="flex items-center gap-2 text-primary font-bold text-lg">
          <Shield className="w-6 h-6" />
          <span>FraudShield</span>
        </a>

        <div className="hidden lg:flex items-center gap-4 xl:gap-6">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-xs xl:text-sm text-muted-foreground hover:text-foreground transition-colors duration-300 whitespace-nowrap"
            >
              {l.label}
            </a>
          ))}
        </div>

        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background/95 backdrop-blur-xl border-b border-white/[0.06]"
          >
            <div className="section-container py-4 flex flex-col gap-4">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {l.label}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
