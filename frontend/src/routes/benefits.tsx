import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { CATEGORIES } from "@/lib/data";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/benefits")({
  head: () => ({ meta: [{ title: "Benefits — WelfareIntel" }] }),
  component: BenefitsLayout,
});

function BenefitsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isOnCategory = pathname !== "/benefits";

  // When on a child route like /benefits/SC, render only the child via Outlet
  if (isOnCategory) {
    return <Outlet />;
  }

  return <BenefitsPage />;
}

function BenefitsPage() {
  const { lang } = useApp();
  return (
    <AppShell>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <h1 className="font-display text-3xl font-bold md:text-4xl">
          {lang === "en" ? "Benefits" : "சலுகைகள்"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {lang === "en"
            ? "Pick a category to explore scholarships and schemes."
            : "ஒரு வகையை தேர்ந்தெடுக்கவும்."}
        </p>
      </motion.div>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {CATEGORIES.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            whileHover={{ y: -6 }}
          >
            <Link
              to="/benefits/$category"
              params={{ category: c.id }}
              className="glass shadow-card group flex h-full flex-col items-start gap-2 rounded-3xl p-6"
            >
              <div>
                <div className="font-display text-lg font-semibold">{c.en}</div>
                <div className="text-xs text-muted-foreground" lang="ta">
                  {c.ta}
                </div>
              </div>
              <span className="mt-auto text-xs font-semibold text-primary">
                {lang === "en" ? "Explore →" : "பார்வையிட →"}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </AppShell>
  );
}
