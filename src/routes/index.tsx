import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { BENEFITS, FEATURES } from "@/lib/data";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WelfareIntel — Discover Tamil Nadu Welfare with AI" },
      {
        name: "description",
        content:
          "AI-powered discovery and registration for Tamil Nadu government schemes and scholarships.",
      },
      { property: "og:title", content: "WelfareIntel — Tamil Nadu Welfare, simplified by AI" },
      {
        property: "og:description",
        content: "Find, understand, and apply for TN welfare schemes and scholarships in minutes.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { lang } = useApp();
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Decorative orbs */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-accent/40 blur-3xl"
        animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl"
        animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Top bar */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl gradient-hero shadow-glow">
            <span className="font-display text-lg font-bold text-primary-foreground">W</span>
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">WelfareIntel</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            search={{ mode: "signin" }}
            className="rounded-xl px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-muted"
          >
            {lang === "en" ? "Sign In" : "உள்நுழை"}
          </Link>
          <Link
            to="/auth"
            search={{ mode: "login" }}
            className="rounded-xl gradient-hero px-4 py-2 text-sm font-semibold text-primary-foreground shadow-card transition hover:shadow-glow"
          >
            {lang === "en" ? "Login" : "உள்நுழைய"}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-16 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium text-primary"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          Tamil Nadu • AI-powered welfare access
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl"
        >
          <span className="block">Discover, Understand,</span>
          <span className="gradient-text">and Apply.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground md:text-lg"
        >
          A smart platform helping citizens find Tamil Nadu welfare schemes and scholarships, and
          simplifying applications through AI assistance and registration automation.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mt-10 flex items-center justify-center gap-3"
        >
          <Link
            to="/auth"
            search={{ mode: "signin" }}
            className="rounded-2xl glass-strong px-6 py-3 text-sm font-semibold transition hover:-translate-y-0.5"
          >
            Sign In
          </Link>
          <Link
            to="/auth"
            search={{ mode: "login" }}
            className="rounded-2xl gradient-hero px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:-translate-y-0.5"
          >
            Login →
          </Link>
        </motion.div>

        {/* Hero preview card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="glass-strong relative mx-auto mt-20 max-w-4xl rounded-3xl p-6 text-left"
        >
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { k: "Schemes", v: "120+", note: "TN curated" },
              { k: "Scholarships", v: "40+", note: "Education focus" },
              { k: "Avg. apply time", v: "3 min", note: "With automation" },
            ].map((s) => (
              <div key={s.k} className="rounded-2xl bg-surface-muted/60 p-5">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.k}</div>
                <div className="mt-2 font-display text-3xl font-bold text-foreground">{s.v}</div>
                <div className="text-xs text-muted-foreground">{s.note}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <SectionTitle eyebrow="Features" title="Everything you need, in one place." />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title.en}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              whileHover={{ y: -6 }}
              className="glass shadow-card rounded-3xl p-6"
            >
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-2xl">
                {f.icon}
              </div>
              <h3 className="font-display text-lg font-semibold">{f.title.en}</h3>
              <p className="mt-1 text-xs text-muted-foreground" lang="ta">
                {f.title.ta}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">{f.desc.en}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* AI Assistant preview */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="glass-strong grid gap-8 rounded-3xl p-8 md:grid-cols-2 md:p-12">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              AI Assistant
            </div>
            <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">
              Ask. Understand. Apply.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Get instant answers about eligibility, required documents, scheme guidance, and
              personalised scholarship recommendations — in English or Tamil.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              {[
                "Eligibility questions",
                "Scheme guidance",
                "Scholarship recommendations",
                "Application support",
              ].map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-success text-[10px] text-success-foreground">
                    ✓
                  </span>
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-surface-muted/60 p-5">
            <ChatBubble role="user" text="Am I eligible for Pudhumai Penn?" />
            <ChatBubble
              role="ai"
              text="If you completed Classes 6–12 in a TN Government school and are now in UG/Diploma/ITI, yes — you'll receive ₹1,000/month."
            />
            <ChatBubble role="user" text="What documents do I need?" />
            <ChatBubble
              role="ai"
              text="Aadhaar, Class 12 marksheet, TC, Bonafide, EMIS ID, and your bank passbook front page."
            />
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <SectionTitle eyebrow="Why WelfareIntel" title="Built for citizens, not paperwork." />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {BENEFITS.map((b, i) => (
            <motion.div
              key={b.title.en}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="glass shadow-card rounded-2xl p-5 text-center"
            >
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-accent/40 text-2xl">
                {b.icon}
              </div>
              <div className="font-display text-sm font-semibold">{b.title.en}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground" lang="ta">
                {b.title.ta}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-border/60 bg-surface/50 py-10 text-center text-xs text-muted-foreground backdrop-blur">
        © {new Date().getFullYear()} WelfareIntel · Information aggregated for citizen convenience.
        Always confirm on official portals.
      </footer>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="text-center">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</div>
      <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-5xl">{title}</h2>
    </div>
  );
}

function ChatBubble({ role, text }: { role: "user" | "ai"; text: string }) {
  return (
    <div className={`mb-2 flex ${role === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${role === "user" ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}
      >
        {text}
      </div>
    </div>
  );
}
