import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import RulesVsAI from "@/components/RulesVsAI";
import Dashboard from "@/components/Dashboard";
import BatchProcessing from "@/components/BatchProcessing";
import FraudNetwork from "@/components/FraudNetwork";
import AIModelsAndMetrics from "@/components/AIModelsAndMetrics";
import ExplainableAI from "@/components/ExplainableAI";
import FuturePrediction from "@/components/FuturePrediction";
import Alerts from "@/components/Alerts";
import About from "@/components/About";
import Team from "@/components/Team";
import Footer from "@/components/Footer";
import LiveAlertToasts from "@/components/LiveAlertToasts";
import { Toaster } from "sonner";

const Index = () => (
  <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: "hsl(222, 40%, 10%)",
          border: "1px solid hsl(222, 30%, 20%)",
          color: "hsl(210, 40%, 96%)",
        },
      }}
    />
    <LiveAlertToasts />
    <Navbar />
    <Hero />
    <RulesVsAI />
    <Dashboard />
    <BatchProcessing />
    <FraudNetwork />
    <AIModelsAndMetrics />
    <ExplainableAI />
    <FuturePrediction />
    <Alerts />
    <About />
    <Team />
    <Footer />
  </div>
);

export default Index;
