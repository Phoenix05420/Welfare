import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { SchemeCard } from "@/components/SchemeCard";
import { CATEGORIES, SCHEMES, type Category, type SchemeType } from "@/lib/data";
import { useApp } from "@/lib/store";
import { API_BASE_URL } from "@/lib/api";

type SortOption = "default" | "az" | "za" | "deadline";

export const Route = createFileRoute("/benefits/$category")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.category} — WelfareIntel` },
      {
        name: "description",
        content: `Browse all schemes and scholarships for ${params.category} category in Tamil Nadu.`,
      },
    ],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { category } = Route.useParams();
  const { lang } = useApp();
  const cat = CATEGORIES.find((c) => c.id === category);
  if (!cat) throw notFound();

  const [type, setType] = useState<SchemeType | "all">("all");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [scraped, setScraped] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/scraped-schemes?per_page=100`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.items) {
          setScraped(data.items);
        }
      })
      .catch((err) => console.error("Failed to fetch scraped schemes for category page:", err));
  }, [category]);

  const combinedSchemes = useMemo(() => {
    return [...SCHEMES, ...scraped];
  }, [scraped]);

  const allItems = useMemo(
    () => combinedSchemes.filter((s) => s.categories.includes(category as any)),
    [category, combinedSchemes],
  );

  const scholarships = allItems.filter((s) => s.type === "scholarship");
  const schemes = allItems.filter((s) => s.type !== "scholarship");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);
    let result = allItems
      .filter((s) => type === "all" || s.type === type)
      .filter((s) => {
        if (tokens.length === 0) return true;
        const haystack = [
          s.name.en,
          s.name.ta,
          s.shortDescription.en,
          s.shortDescription.ta,
          ...(s.tags || []),
          ...(s.categories || []),
        ]
          .join(" ")
          .toLowerCase();
        return tokens.every((token) => haystack.includes(token));
      });

    // Sort
    if (sortBy === "az") {
      result = [...result].sort((a, b) =>
        a.name[lang].localeCompare(b.name[lang]),
      );
    } else if (sortBy === "za") {
      result = [...result].sort((a, b) =>
        b.name[lang].localeCompare(a.name[lang]),
      );
    } else if (sortBy === "deadline") {
      result = [...result].sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      });
    }

    return result;
  }, [allItems, type, query, sortBy, lang]);

  const filteredScholarships = filtered.filter((s) => s.type === "scholarship");
  const filteredSchemes = filtered.filter((s) => s.type === "scheme");

  // Pagination logic
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  // Reset to first page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [category, type, query, sortBy]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedFiltered = filtered.slice(startIndex, startIndex + itemsPerPage);

  const paginatedScholarships = paginatedFiltered.filter((s) => s.type === "scholarship");
  const paginatedSchemes = paginatedFiltered.filter((s) => s.type === "scheme");

  const tabs: { id: SchemeType | "all"; labelEn: string; labelTa: string }[] = [
    { id: "all", labelEn: "All", labelTa: "அனைத்தும்" },
    { id: "scholarship", labelEn: "Scholarships", labelTa: "உதவித்தொகை" },
    { id: "scheme", labelEn: "Schemes", labelTa: "திட்டங்கள்" },
  ];

  return (
    <AppShell>
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/benefits" className="hover:text-primary transition-colors">
          {lang === "en" ? "Benefits" : "சலுகைகள்"}
        </Link>
        <span className="opacity-40">/</span>
        <span className="text-foreground font-medium">{cat.en}</span>
      </nav>

      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="glass-strong relative mb-8 overflow-hidden rounded-3xl p-8"
      >
        {/* Decorative bg orb */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <h1 className="font-display text-3xl font-bold md:text-4xl">{cat.en}</h1>
            <p className="mt-1 text-base text-muted-foreground" lang="ta">
              {cat.ta}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {lang === "en"
                ? `${allItems.length} benefit${allItems.length !== 1 ? "s" : ""} available`
                : `${allItems.length} சலுகைகள் கிடைக்கின்றன`}
            </p>
          </div>

          {/* Stat pills */}
          <div className="flex flex-wrap gap-3">
            <StatPill
              icon="🎓"
              count={scholarships.length}
              labelEn="Scholarships"
              labelTa="உதவித்தொகை"
              lang={lang}
            />
            <StatPill
              icon="🏛️"
              count={schemes.length}
              labelEn="Schemes"
              labelTa="திட்டங்கள்"
              lang={lang}
            />
          </div>
        </div>
      </motion.div>

      {/* Filter bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="glass-strong mb-8 flex flex-col gap-3 rounded-2xl px-4 py-4"
      >
        {/* Top row: Type tabs + Sort + Result count */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Type tabs */}
          <div className="flex items-center gap-1 rounded-xl bg-surface-muted p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setType(tab.id)}
                className={`relative rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  type === tab.id
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {type === tab.id && (
                  <motion.span
                    layoutId="type-pill"
                    className="absolute inset-0 rounded-lg gradient-hero"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative">{lang === "en" ? tab.labelEn : tab.labelTa}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Sort dropdown */}
            <div className="flex items-center gap-2 rounded-xl border border-input bg-card px-3 py-1.5">
              <span className="text-muted-foreground text-xs">↕️</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent text-xs font-medium outline-none text-foreground cursor-pointer"
              >
                <option value="default">{lang === "en" ? "Default" : "இயல்பு"}</option>
                <option value="az">{lang === "en" ? "Name A → Z" : "பெயர் அ → ஃ"}</option>
                <option value="za">{lang === "en" ? "Name Z → A" : "பெயர் ஃ → அ"}</option>
                <option value="deadline">{lang === "en" ? "Deadline (Soonest)" : "காலக்கெடு (விரைவான)"}</option>
              </select>
            </div>

            {/* Result count */}
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {filtered.length}{" "}
              {lang === "en"
                ? `result${filtered.length !== 1 ? "s" : ""}`
                : "முடிவு"}
            </span>
          </div>
        </div>

        {/* Bottom row: Search bar */}
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-input bg-card px-3 py-2 transition-colors focus-within:border-primary">
          <span className="text-muted-foreground text-sm">🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              lang === "en"
                ? "Search by name, keyword, or category…"
                : "பெயர், சொல் அல்லது வகை மூலம் தேடுங்கள்…"
            }
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="flex items-center gap-1 rounded-lg bg-surface-muted px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground transition"
            >
              {lang === "en" ? "Clear" : "அழி"} ✕
            </button>
          )}
        </div>

        {/* Active filters summary */}
        {(type !== "all" || sortBy !== "default" || query) && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-muted-foreground font-medium">
              {lang === "en" ? "Active filters:" : "செயலில் உள்ள வடிப்பான்கள்:"}
            </span>
            {type !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                {lang === "en" ? tabs.find(t => t.id === type)?.labelEn : tabs.find(t => t.id === type)?.labelTa}
                <button onClick={() => setType("all")} className="ml-0.5 hover:text-foreground">✕</button>
              </span>
            )}
            {sortBy !== "default" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                {sortBy === "az" ? (lang === "en" ? "A→Z" : "அ→ஃ") : sortBy === "za" ? (lang === "en" ? "Z→A" : "ஃ→அ") : (lang === "en" ? "Deadline" : "காலக்கெடு")}
                <button onClick={() => setSortBy("default")} className="ml-0.5 hover:text-foreground">✕</button>
              </span>
            )}
            {query && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                "{query}"
                <button onClick={() => setQuery("")} className="ml-0.5 hover:text-foreground">✕</button>
              </span>
            )}
            <button
              onClick={() => { setType("all"); setSortBy("default"); setQuery(""); }}
              className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition"
            >
              {lang === "en" ? "Reset all" : "அனைத்தையும் மீட்டமை"}
            </button>
          </div>
        )}
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="glass shadow-card rounded-3xl p-16 text-center"
          >
            <div className="mx-auto mb-4 text-5xl">🔍</div>
            <div className="font-display text-lg font-semibold">
              {lang === "en" ? "No results found" : "முடிவுகள் இல்லை"}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {lang === "en"
                ? "Try a different keyword or clear the filter."
                : "வேறு வார்த்தை முயற்சிக்கவும்."}
            </p>
            <button
              onClick={() => {
                setQuery("");
                setType("all");
                setSortBy("default");
              }}
              className="mt-5 rounded-xl gradient-hero px-5 py-2 text-sm font-semibold text-primary-foreground"
            >
              {lang === "en" ? "Clear filters" : "வடிகட்டி நீக்கு"}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Scholarships section */}
            {(type === "all" || type === "scholarship") && paginatedScholarships.length > 0 && (
              <SchemeSection
                icon="🎓"
                title={lang === "en" ? "Scholarships" : "உதவித்தொகைகள்"}
                subtitle={lang === "en" ? `Showing scholarships on this page` : `உதவித்தொகை`}
                accentClass="bg-accent/40 text-primary"
              >
                {paginatedScholarships.map((s, i) => (
                  <SchemeCard key={s.id} scheme={s} index={i} />
                ))}
              </SchemeSection>
            )}

            {/* Schemes section */}
            {(type === "all" || type === "scheme") && paginatedSchemes.length > 0 && (
              <SchemeSection
                icon="🏛️"
                title={lang === "en" ? "Government Schemes" : "அரசு திட்டங்கள்"}
                subtitle={lang === "en" ? `Showing schemes on this page` : `திட்டங்கள்`}
                accentClass="bg-primary-soft text-primary"
              >
                {paginatedSchemes.map((s, i) => (
                  <SchemeCard key={s.id} scheme={s} index={i} />
                ))}
              </SchemeSection>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="rounded-xl bg-surface-muted px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-50 transition hover:bg-surface-muted/80"
                >
                  {lang === "en" ? "Previous" : "முந்தைய"}
                </button>
                <div className="flex items-center px-4 text-sm font-medium">
                  {lang === "en"
                    ? `Page ${currentPage} of ${totalPages}`
                    : `பக்கம் ${currentPage} / ${totalPages}`}
                </div>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-xl gradient-hero px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 transition shadow-card hover:shadow-glow"
                >
                  {lang === "en" ? "Next" : "அடுத்தது"}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Other categories quick-nav */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="mt-14"
      >
        <h2 className="mb-4 font-display text-lg font-semibold text-muted-foreground">
          {lang === "en" ? "Explore other categories" : "மற்ற வகைகள்"}
        </h2>
        <div className="flex flex-wrap gap-3">
          {CATEGORIES.filter((c) => c.id !== category).map((c) => (
            <Link
              key={c.id}
              to="/benefits/$category"
              params={{ category: c.id }}
              className="glass shadow-card flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 hover:text-primary"
            >
              <span>{c.icon}</span>
              <span>{c.en}</span>
            </Link>
          ))}
        </div>
      </motion.section>
    </AppShell>
  );
}

/* ─── Sub-components ─── */

function SchemeSection({
  icon,
  title,
  subtitle,
  accentClass,
  children,
}: {
  icon: string;
  title: string;
  subtitle: string;
  accentClass: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-12"
    >
      <div className="mb-5 flex items-center gap-4">
        <div className={`grid h-10 w-10 place-items-center rounded-xl text-xl ${accentClass}`}>
          {icon}
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </motion.section>
  );
}

function StatPill({
  icon,
  count,
  labelEn,
  labelTa,
  lang,
}: {
  icon: string;
  count: number;
  labelEn: string;
  labelTa: string;
  lang: "en" | "ta";
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-surface-muted/80 px-4 py-2.5">
      <span className="text-xl">{icon}</span>
      <div>
        <div className="font-display text-xl font-bold leading-none">{count}</div>
        <div className="text-[11px] text-muted-foreground">{lang === "en" ? labelEn : labelTa}</div>
      </div>
    </div>
  );
}
