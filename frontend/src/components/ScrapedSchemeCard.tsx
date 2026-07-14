import { motion } from "framer-motion";
import type { ScrapedScheme } from "@/lib/data";
import { SOURCE_LABELS } from "@/lib/data";
import { useApp } from "@/lib/store";

export function ScrapedSchemeCard({
  scheme,
  index = 0,
}: {
  scheme: ScrapedScheme;
  index?: number;
}) {
  const { lang } = useApp();
  const sourceLabel = SOURCE_LABELS[scheme.source];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className="glass shadow-card group relative flex h-full flex-col overflow-hidden rounded-3xl p-5"
    >
      {/* Top badges */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {/* Source badge */}
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${sourceLabel.color}`}
          >
            {sourceLabel[lang]}
          </span>
          {/* Type badge */}
          <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
            {scheme.type.replace(/_/g, " ")}
          </span>
        </div>
        {scheme.pdfUrl && (
          <a
            href={scheme.pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded-lg bg-surface-muted px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            📄 PDF
          </a>
        )}
      </div>

      {/* Scheme name */}
      <h3 className="font-display text-base font-semibold leading-snug text-foreground">
        {scheme.name.en}
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground" lang="ta">
        {scheme.name.ta}
      </p>

      {/* Short description */}
      <p className="mt-3 line-clamp-3 flex-1 text-sm text-muted-foreground">
        {scheme.shortDescription[lang]}
      </p>

      {/* Category tags */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {scheme.categories.slice(0, 3).map((c) => (
          <span
            key={c}
            className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-muted-foreground"
          >
            {c}
          </span>
        ))}
        {scheme.categories.length > 3 && (
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            +{scheme.categories.length - 3}
          </span>
        )}
      </div>

      {/* Bottom action */}
      <div className="mt-5 flex items-center justify-end">
        <a
          href={scheme.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition group-hover:shadow-glow"
        >
          {lang === "en" ? "View Source →" : "மூலத்தைக் காண →"}
        </a>
      </div>
    </motion.div>
  );
}
