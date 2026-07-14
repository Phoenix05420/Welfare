import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { SchemeCard } from "@/components/SchemeCard";
import { Pagination } from "@/components/Pagination";

import { CATEGORIES, SCHEMES } from "@/lib/data";
import { useApp } from "@/lib/store";
import { API_BASE_URL } from "@/lib/api";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — WelfareIntel" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, lang } = useApp();
  const [query, setQuery] = useState("");
  const [scraped, setScraped] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/scraped-schemes?per_page=100`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.items) {
          setScraped(data.items);
        }
      })
      .catch((err) => console.error("Failed to fetch scraped schemes for dashboard:", err));
  }, []);

  const combinedSchemes = useMemo(() => {
    return [...SCHEMES, ...scraped];
  }, [scraped]);

  const [scholarshipPage, setScholarshipPage] = useState(1);

  useEffect(() => {
    setScholarshipPage(1);
  }, [query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return combinedSchemes;
    return combinedSchemes.filter((s) =>
      [s.name.en, s.name.ta, s.shortDescription.en, ...s.categories]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [query, combinedSchemes]);

  const allScholarships = useMemo(
    () => filtered.filter((s) => s.type === "scholarship"),
    [filtered],
  );

  const totalScholarshipPages = Math.ceil(allScholarships.length / 9);

  const paginatedScholarships = useMemo(() => {
    return allScholarships.slice((scholarshipPage - 1) * 9, scholarshipPage * 9);
  }, [allScholarships, scholarshipPage]);

  return (
    <AppShell>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <div className="text-sm text-muted-foreground">
          {lang === "en" ? "Welcome back" : "மீண்டும் வரவேற்கிறோம்"},
        </div>
        <h1 className="font-display text-3xl font-bold md:text-4xl">
          {user?.name || "Citizen"} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {lang === "en"
            ? "Discover schemes & scholarships personalised for you."
            : "உங்களுக்கான திட்டங்கள் & உதவித்தொகைகள்."}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="glass-strong mb-10 flex items-center gap-3 rounded-2xl px-4 py-3"
      >
        <span className="text-lg">🔍</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            lang === "en"
              ? "Search schemes, scholarships, keywords…"
              : "திட்டம், உதவித்தொகை, முக்கிய சொற்கள்…"
          }
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <Link
          to="/benefits"
          className="hidden rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground md:inline-block"
        >
          {lang === "en" ? "Browse all" : "அனைத்தும்"}
        </Link>
      </motion.div>

      {/* Quick categories */}
      <div className="mb-12">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-xl font-semibold">
            {lang === "en" ? "Browse by category" : "வகை வாரியாக"}
          </h2>
          <Link to="/benefits" className="text-xs font-medium text-primary hover:underline">
            {lang === "en" ? "All categories →" : "அனைத்தும் →"}
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {CATEGORIES.slice(0, 10).map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link
                to="/benefits/$category"
                params={{ category: c.id }}
                className="glass shadow-card flex flex-col rounded-2xl p-4 transition hover:-translate-y-0.5"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{c.en}</div>
                  <div className="truncate text-[11px] text-muted-foreground" lang="ta">
                    {c.ta}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      <Section title={lang === "en" ? "Featured Scholarships" : "சிறப்பு உதவித்தொகைகள்"}>
        {paginatedScholarships.map((s, i) => (
          <SchemeCard key={s.id} scheme={s} index={i} />
        ))}
      </Section>
      <Pagination
        currentPage={scholarshipPage}
        totalPages={totalScholarshipPages}
        onPageChange={(p) => setScholarshipPage(p)}
      />
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="mb-5 font-display text-xl font-semibold">{title}</h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}
