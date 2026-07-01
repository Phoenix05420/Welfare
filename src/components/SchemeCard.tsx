import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import type { Scheme, ScrapedSchemeSource } from "@/lib/data";
import { SOURCE_LABELS } from "@/lib/data";
import { useApp, app } from "@/lib/store";

export function SchemeCard({ scheme, index = 0 }: { scheme: any; index?: number }) {
  const { lang, savedSchemes } = useApp();
  const saved = savedSchemes.includes(scheme.id);
  const isScholarship = scheme.type === "scholarship";
  const sourceLabel = scheme.source ? SOURCE_LABELS[scheme.source as ScrapedSchemeSource] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className="glass shadow-card group relative flex h-full flex-col overflow-hidden rounded-3xl p-5"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {sourceLabel && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${sourceLabel.color}`}
            >
              {sourceLabel[lang]}
            </span>
          )}
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
              isScholarship ? "bg-accent/40 text-primary" : "bg-primary-soft text-primary"
            }`}
          >
            {isScholarship
              ? lang === "en"
                ? "Scholarship"
                : "உதவித்தொகை"
              : lang === "en"
                ? "Scheme"
                : "திட்டம்"}
          </span>
        </div>
        <button
          onClick={() => app.toggleSaved(scheme.id)}
          aria-label="Save"
          className={`text-lg transition-transform hover:scale-110 ${saved ? "text-primary" : "text-muted-foreground"}`}
        >
          {saved ? "♥" : "♡"}
        </button>
      </div>
      <h3 className="font-display text-base font-semibold leading-snug text-foreground">
        {scheme.name.en}
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground" lang="ta">
        {scheme.name.ta}
      </p>
      <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
        {scheme.shortDescription[lang]}
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {scheme.categories.slice(0, 3).map((c: string) => (
          <span
            key={c}
            className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-muted-foreground"
          >
            {c}
          </span>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between">
        {scheme.deadline ? (
          <span className="text-[11px] text-muted-foreground">
            ⏳{" "}
            {new Date(scheme.deadline).toLocaleDateString(lang === "ta" ? "ta-IN" : "en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        ) : (
          <span />
        )}
        <Link
          to="/scheme/$id"
          params={{ id: scheme.id }}
          className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition group-hover:shadow-glow"
        >
          {lang === "en" ? "View →" : "பார்க்க →"}
        </Link>
      </div>
    </motion.div>
  );
}
