import { motion } from "framer-motion";
import { Github, Linkedin } from "lucide-react";

const team = [
  { name: "Arnav Shende", role: "ML Engineer", initials: "AS" },
  { name: "Vedant Kowdiki", role: "Full-Stack Developer", initials: "VK" },
  { name: "Aryan Medigeri", role: "Data Scientist", initials: "AM" },
  { name: "Sakshi Sharan", role: "Frontend & UX", initials: "SS" },
];

const Team = () => (
  <section id="team" className="py-24 md:py-32 border-t border-white/[0.04]">
    <div className="section-container">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Meet the Team</h2>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-4xl mx-auto">
        {team.map((m, i) => (
          <motion.div
            key={m.name}
            initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card-hover p-6 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold mx-auto mb-4">
              {m.initials}
            </div>
            <h4 className="font-semibold">{m.name}</h4>
            <p className="text-xs text-muted-foreground mt-1 mb-4">{m.role}</p>
            <div className="flex justify-center gap-3">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors"><Github className="w-4 h-4" /></a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors"><Linkedin className="w-4 h-4" /></a>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Team;
