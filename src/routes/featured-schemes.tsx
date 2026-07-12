import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { SchemeCard } from "@/components/SchemeCard";
import { Pagination } from "@/components/Pagination";
import { SCHEMES } from "@/lib/data";
import { useApp } from "@/lib/store";
import { AutoApplyModal } from "@/components/AutoApplyModal";

export const Route = createFileRoute("/featured-schemes")({
  head: () => ({
    meta: [
      { title: "Featured Schemes — WelfareIntel" },
      { name: "description", content: "Explore featured welfare schemes for Tamil Nadu citizens." },
    ],
  }),
  component: FeaturedSchemesPage,
});

function FeaturedSchemesPage() {
  const { lang } = useApp();
  const [query, setQuery] = useState("");
  const [scraped, setScraped] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoFormUrl, setDemoFormUrl] = useState("https://forms.gle/5Qzso2XwpVB4uoML7");

  useEffect(() => {
    fetch("http://localhost:8000/api/scraped-schemes?per_page=100")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.items) {
          setScraped(data.items);
        }
      })
      .catch((err) => console.error("Failed to fetch scraped schemes for schemes page:", err));
  }, []);

  const combinedSchemes = useMemo(() => {
    // Filter to only include non-scholarships (schemes, financial assistance, etc.)
    const staticSchemes = SCHEMES.filter((s) => s.type !== "scholarship");
    const scrapedSchemes = scraped.filter((s) => s.type !== "scholarship");
    return [...staticSchemes, ...scrapedSchemes];
  }, [scraped]);

  useEffect(() => {
    setPage(1);
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

  const totalPages = Math.ceil(filtered.length / 9);

  const paginatedSchemes = useMemo(() => {
    return filtered.slice((page - 1) * 9, page * 9);
  }, [filtered, page]);

  return (
    <AppShell>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <h1 className="font-display text-3xl font-bold md:text-4xl">
          {lang === "en" ? "Featured Schemes" : "சிறப்பு திட்டங்கள்"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {lang === "en"
            ? "Explore welfare and assistance schemes personalized for you."
            : "உங்களுக்கான நலத்திட்டங்கள்."}
        </p>
      </motion.div>

      {/* Filter bar */}
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
          placeholder={lang === "en" ? "Search schemes, keywords…" : "திட்டங்கள், சொற்கள் தேடுக…"}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="text-muted-foreground hover:text-foreground text-xs px-2"
          >
            ✕
          </button>
        )}
      </motion.div>

      {/* Schemes Grid */}
      <section className="mb-12">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedSchemes.map((s, i) => (
            <SchemeCard key={s.id} scheme={s} index={i} />
          ))}
        </div>

        {paginatedSchemes.length === 0 && (
          <div className="glass rounded-3xl p-12 text-center text-muted-foreground">
            {lang === "en"
              ? "No schemes found matching your search."
              : "தேடலுக்கு பொருந்தும் திட்டங்கள் இல்லை."}
          </div>
        )}

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} />

        {/* Demo Auto-Apply Card */}
        <div className="mt-16 glass-strong rounded-3xl p-8 lg:p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent"></div>
          <div className="relative z-10 md:flex md:items-center md:justify-between">
            <div className="mb-6 md:mb-0 md:max-w-xl">
              <h2 className="text-2xl font-bold font-display mb-2 text-primary">
                {lang === "en" ? "Demo: Magic Auto-Apply 🤖" : "டெமோ: மேஜிக் ஆட்டோ அப்ளை 🤖"}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                {lang === "en" 
                  ? "Try our powerful new Playwright-based Auto-Apply feature! Our AI maps the Google Form requirements, asks you only for what's missing, and submits the form invisibly in the background."
                  : "எங்கள் புதிய Playwright ஆட்டோ அப்ளை அம்சத்தை முயற்சிக்கவும்! AI Google படிவத்தின் தேவைகளை வரைபடமாக்குகிறது, விடுபட்டதை மட்டும் கேட்கிறது, மற்றும் தானாகவே படிவத்தை சமர்ப்பிக்கிறது."}
              </p>
              <div className="flex flex-col gap-2 max-w-md mt-4">
                <label className="text-xs font-semibold text-muted-foreground">
                  {lang === "en" ? "Paste Google Form URL to test:" : "சோதிக்க Google படிவ URLஐ ஒட்டவும்:"}
                </label>
                <input
                  type="text"
                  value={demoFormUrl}
                  onChange={(e) => setDemoFormUrl(e.target.value)}
                  placeholder="https://forms.gle/..."
                  className="bg-background/50 border border-border rounded-xl px-4 py-2 text-sm outline-none focus:border-primary transition-colors text-foreground"
                />
              </div>
            </div>
            <div>
              <button 
                onClick={() => setDemoModalOpen(true)}
                className="w-full md:w-auto px-8 py-4 gradient-hero text-primary-foreground font-bold rounded-2xl shadow-glow hover:scale-105 transition-transform"
              >
                {lang === "en" ? "Test Auto-Apply Now" : "இப்போது டெமோவை முயற்சிக்கவும்"}
              </button>
            </div>
          </div>
        </div>

      </section>

      <AutoApplyModal 
        isOpen={demoModalOpen} 
        onClose={() => setDemoModalOpen(false)} 
        formUrl={demoFormUrl} 
      />
    </AppShell>
  );
}
