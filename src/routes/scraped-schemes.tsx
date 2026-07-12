import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { ScrapedSchemeCard } from "@/components/ScrapedSchemeCard";
import { Pagination } from "@/components/Pagination";
import { useApp, t } from "@/lib/store";
import type { ScrapedScheme, ScrapedSchemeSource } from "@/lib/data";
import { API_BASE_URL } from "@/lib/api";

export const Route = createFileRoute("/scraped-schemes")({
  head: () => ({
    meta: [
      { title: "Scraped Data — WelfareIntel" },
      {
        name: "description",
        content:
          "Real-time TN welfare schemes and scholarships scraped from official portals and aligned by AI.",
      },
    ],
  }),
  component: ScrapedSchemesPage,
});

const API_BASE = API_BASE_URL;

function ScrapedSchemesPage() {
  const { lang } = useApp();
  const [items, setItems] = useState<ScrapedScheme[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [source, setSource] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchemes = useCallback(
    async (targetPage: number, targetSource: string) => {
      setLoading(true);
      setError(null);
      try {
        const sourceQuery = targetSource !== "all" ? `&source=${targetSource}` : "";
        const res = await fetch(
          `${API_BASE}/api/scraped-schemes?page=${targetPage}&per_page=9${sourceQuery}`,
        );
        if (!res.ok) throw new Error("Failed to fetch scraped schemes");
        const data = await res.json();
        setItems(data.items);
        setPage(data.page);
        setTotalPages(data.total_pages);
        setTotal(data.total);
      } catch (err: any) {
        console.error(err);
        setError(
          lang === "en"
            ? "Could not connect to the WelfareIntel API. Make sure the backend server is running."
            : "வழங்கி உடன் இணைக்க முடியவில்லை. சர்வர் இயங்குவதை உறுதிசெய்யவும்.",
        );
      } finally {
        setLoading(false);
      }
    },
    [lang],
  );

  useEffect(() => {
    fetchSchemes(page, source);
  }, [page, source, fetchSchemes]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/refresh-scraped`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to refresh schemes");
      // Reset page to 1 and reload
      setPage(1);
      await fetchSchemes(1, source);
    } catch (err: any) {
      console.error(err);
      setError(lang === "en" ? "Failed to trigger re-scrape." : "மீண்டும் பெறத் தவறியது.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleSourceChange = (newSource: string) => {
    setSource(newSource);
    setPage(1);
  };

  const tabs = [
    { id: "all", labelEn: "All Sources", labelTa: "அனைத்தும்" },
    { id: "tndce_colleges", labelEn: "DCE Colleges", labelTa: "DCE கல்லூரிகள்" },
    { id: "tndce_scholarships", labelEn: "DCE Scholarships", labelTa: "DCE உதவித்தொகைகள்" },
    { id: "govtschemes", labelEn: "Govt Schemes", labelTa: "அரசு திட்டங்கள்" },
  ];

  return (
    <AppShell>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="font-display text-3xl font-bold md:text-4xl">
            {lang === "en" ? "Scraped Data" : "சேகரிக்கப்பட்ட தரவு"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {lang === "en"
              ? "Live crawled government data aligned into structured bilingual scheme cards by Ministral-14B."
              : "அரசு இணையதளங்களில் இருந்து பெறப்பட்டு Ministral-14B AI மூலம் சீரமைக்கப்பட்ட திட்டங்கள்."}
          </p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleRefresh}
          disabled={refreshing}
          className="glass-strong flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold text-foreground transition hover:bg-surface-muted disabled:opacity-50"
        >
          <span className={`text-sm ${refreshing ? "animate-spin" : ""}`}>🔄</span>
          {refreshing
            ? lang === "en"
              ? "Crawling & Aligning..."
              : "சேகரிக்கப்படுகிறது..."
            : lang === "en"
              ? "Re-Scrape & Align"
              : "மீண்டும் பெறுக"}
        </motion.button>
      </div>

      {/* Filter Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="glass-strong mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3"
      >
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-surface-muted p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleSourceChange(tab.id)}
              className={`relative rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                source === tab.id
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {source === tab.id && (
                <motion.span
                  layoutId="scraped-source-pill"
                  className="absolute inset-0 rounded-lg gradient-hero"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative">{lang === "en" ? tab.labelEn : tab.labelTa}</span>
            </button>
          ))}
        </div>

        {!loading && !error && (
          <span className="text-xs text-muted-foreground px-2">
            {lang === "en"
              ? `Found ${total} item${total !== 1 ? "s" : ""}`
              : `${total} திட்டங்கள் உள்ளன`}
          </span>
        )}
      </motion.div>

      {/* Error state */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="glass border-destructive/20 rounded-3xl p-8 text-center"
          >
            <div className="mx-auto mb-3 text-4xl">⚠️</div>
            <h3 className="font-display text-lg font-bold text-foreground">
              {lang === "en" ? "Connection Failed" : "இணைப்பு தோல்வி"}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => fetchSchemes(page, source)}
              className="mt-5 rounded-xl gradient-hero px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:shadow-glow"
            >
              {lang === "en" ? "Retry" : "மீண்டும் முயல்க"}
            </button>
          </motion.div>
        )}

        {/* Loading state */}
        {!error && loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass shadow-card h-48 animate-pulse rounded-3xl p-5">
                <div className="mb-4 flex gap-2">
                  <div className="h-4 w-16 rounded bg-surface-muted" />
                  <div className="h-4 w-12 rounded bg-surface-muted" />
                </div>
                <div className="mb-2 h-5 w-3/4 rounded bg-surface-muted" />
                <div className="mb-4 h-4 w-1/2 rounded bg-surface-muted" />
                <div className="mb-2 h-3 w-full rounded bg-surface-muted" />
                <div className="h-3 w-5/6 rounded bg-surface-muted" />
              </div>
            ))}
          </motion.div>
        )}

        {/* Schemes Grid */}
        {!error && !loading && items.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="glass rounded-3xl p-16 text-center"
          >
            <div className="mx-auto mb-4 text-5xl">🏛️</div>
            <div className="font-display text-lg font-semibold">
              {lang === "en" ? "No Schemes Found" : "திட்டங்கள் எதுவும் இல்லை"}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {lang === "en"
                ? "Click the button below to scrape live TN government websites."
                : "அரசு இணையதளங்களில் இருந்து புதிய தரவை சேகரிக்க கீழே உள்ள பொத்தானை கிளிக் செய்யவும்."}
            </p>
            <button
              onClick={handleRefresh}
              className="mt-5 rounded-xl gradient-hero px-5 py-2 text-sm font-semibold text-primary-foreground"
            >
              {lang === "en" ? "Start Scraping" : "தரவு சேகரிக்கத் தொடங்கு"}
            </button>
          </motion.div>
        )}

        {!error && !loading && items.length > 0 && (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item, idx) => (
                <ScrapedSchemeCard key={item.id} scheme={item} index={idx} />
              ))}
            </div>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
