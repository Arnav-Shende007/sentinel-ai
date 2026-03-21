import { Shield } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-white/[0.04] py-12">
    <div className="section-container">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2 text-primary font-bold">
          <Shield className="w-5 h-5" />
          FraudShield
        </div>
        <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#demo" className="hover:text-foreground transition-colors">Demo</a>
          <a href="#dashboard" className="hover:text-foreground transition-colors">Dashboard</a>
          <a href="#models" className="hover:text-foreground transition-colors">Models</a>
          <a href="#team" className="hover:text-foreground transition-colors">Team</a>
        </div>
        <div className="text-xs text-muted-foreground text-center md:text-right">
          <div className="text-foreground/30">Built with React, Tailwind CSS & AI</div>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
