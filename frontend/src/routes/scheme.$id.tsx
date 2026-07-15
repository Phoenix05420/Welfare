import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { AIChatbot } from "@/components/AIChatbot";
import { DOCUMENT_LABELS, SCHEMES, type DocKey } from "@/lib/data";
import { app, useApp } from "@/lib/store";
import { API_BASE_URL } from "@/lib/api";

export const Route = createFileRoute("/scheme/$id")({
  head: ({ params }) => {
    const s = SCHEMES.find((x) => x.id === params.id);
    return {
      meta: [
        { title: s ? `${s.name.en} — WelfareIntel` : "Scheme — WelfareIntel" },
        {
          name: "description",
          content: s?.shortDescription.en || "Tamil Nadu government welfare scheme details.",
        },
      ],
    };
  },
  component: SchemePage,
});

function getDocKey(d: any): DocKey | null {
  if (typeof d === "string") {
    return d as DocKey;
  }
  if (d && typeof d === "object" && typeof d.en === "string") {
    const enVal = d.en.toLowerCase();
    for (const key of Object.keys(DOCUMENT_LABELS) as DocKey[]) {
      if (
        key.toLowerCase() === enVal ||
        DOCUMENT_LABELS[key].en.toLowerCase() === enVal ||
        DOCUMENT_LABELS[key].ta.toLowerCase() === d.ta?.toLowerCase()
      ) {
        return key;
      }
    }
    if (enVal.includes("aadhaar") || enVal.includes("aadhar")) return "aadhaar";
    if (enVal.includes("nativity") || enVal.includes("residence")) return "nativity";
    if (enVal.includes("community") || enVal.includes("caste")) return "community";
    if (enVal.includes("income")) return "income";
    if (enVal.includes("10th mark") || enVal.includes("10 class") || enVal.includes("sslc"))
      return "marksheet10";
    if (enVal.includes("12th mark") || enVal.includes("hsc") || enVal.includes("12 class"))
      return "marksheet12";
    if (enVal.includes("transfer certificate") || enVal.includes(" tc")) return "tc";
    if (enVal.includes("bonafide")) return "bonafide";
    if (enVal.includes("emis")) return "emis";
    if (enVal.includes("first graduate")) return "firstGraduate";
    if (enVal.includes("bank") || enVal.includes("passbook")) return "bankPassbook";
  }
  return null;
}

function SchemePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { lang, uploadedDocs, savedSchemes, appliedSchemes } = useApp();

  const [scheme, setScheme] = useState<any>(() => SCHEMES.find((s) => s.id === id));
  const [loading, setLoading] = useState(!scheme);
  const [error, setError] = useState<string | null>(null);
  const [showMissing, setShowMissing] = useState<DocKey[] | null>(null);

  useEffect(() => {
    if (scheme) return;

    setLoading(true);
    setError(null);
    fetch(`${API_BASE_URL}/api/schemes/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Scheme not found");
        return res.json();
      })
      .then((data) => {
        setScheme(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Scheme not found");
        setLoading(false);
      });
  }, [id, scheme]);

  if (loading) {
    return (
      <AppShell hideChatbot>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  if (error || !scheme) {
    return (
      <AppShell hideChatbot>
        <div className="py-12 text-center">
          <h2 className="text-xl font-bold">Scheme not found</h2>
          <Link to="/dashboard" className="mt-4 inline-block text-primary">
            Back to Dashboard
          </Link>
        </div>
      </AppShell>
    );
  }

  const missing = (scheme.requiredDocuments || [])
    .map((d: any) => getDocKey(d))
    .filter((k: DocKey | null): k is DocKey => k !== null && !uploadedDocs[k]);
  const ready = missing.length === 0;
  const saved = savedSchemes.includes(scheme.id);
  const applied = appliedSchemes.includes(scheme.id);

  const handleApply = () => {
    if (!ready) {
      setShowMissing(missing);
      return;
    }
    app.apply(scheme.id);
    setShowMissing(null);
  };

  return (
    <AppShell hideChatbot>
      <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-primary">
        ← {lang === "en" ? "Back to dashboard" : "முகப்புக்கு"}
      </Link>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-strong mt-4 overflow-hidden rounded-3xl p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <span className="inline-block rounded-full bg-primary-soft px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              {scheme.type === "scholarship"
                ? lang === "en"
                  ? "Scholarship"
                  : "உதவித்தொகை"
                : lang === "en"
                  ? "Scheme"
                  : "திட்டம்"}
            </span>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight md:text-4xl">
              {scheme.name.en}
            </h1>
            <p className="mt-1 text-base text-muted-foreground" lang="ta">
              {scheme.name.ta}
            </p>
            <p className="mt-4 max-w-3xl text-sm text-muted-foreground">
              {scheme.description[lang]}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {scheme.categories.map((c: string) => (
                <span
                  key={c}
                  className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[11px] text-muted-foreground"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <EligibilityBadge ready={ready} lang={lang} />
            <button
              onClick={() => app.toggleSaved(scheme.id)}
              className={`rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold transition ${saved ? "text-primary" : "text-muted-foreground"}`}
            >
              {saved
                ? lang === "en"
                  ? "♥ Saved"
                  : "♥ சேமிக்கப்பட்டது"
                : lang === "en"
                  ? "♡ Save"
                  : "♡ சேமி"}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Grid: Benefits / Eligibility */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <InfoCard title={lang === "en" ? "Benefits" : "சலுகைகள்"} icon="🎁">
          <ul className="space-y-3">
            {(scheme.benefits || []).map((b: any, i: number) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 rounded-2xl bg-surface-muted/60 p-3"
              >
                <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-success text-xs text-success-foreground">
                  ✓
                </span>
                <span className="text-sm">{b[lang]}</span>
              </motion.li>
            ))}
          </ul>
        </InfoCard>

        <InfoCard title={lang === "en" ? "Eligibility" : "தகுதி"} icon="✅">
          <ul className="space-y-3">
            {(scheme.eligibility || []).map((b: any, i: number) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 rounded-2xl bg-surface-muted/60 p-3"
              >
                <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-primary-soft text-xs text-primary">
                  {i + 1}
                </span>
                <span className="text-sm">{b[lang]}</span>
              </motion.li>
            ))}
          </ul>
        </InfoCard>
      </div>

      {/* Document tracker */}
      <InfoCard
        className="mt-6"
        title={lang === "en" ? "Required Documents" : "தேவையான ஆவணங்கள்"}
        icon="📄"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {(scheme.requiredDocuments || []).map((d: any, idx: number) => {
            const key = getDocKey(d);
            const has = key ? !!uploadedDocs[key] : false;

            let label = "";
            if (typeof d === "string") {
              label = DOCUMENT_LABELS[d as DocKey]?.[lang] || d;
            } else if (d && typeof d === "object") {
              label = d[lang] || d.en || d.ta || "";
            }

            return (
              <div
                key={key || `doc-${idx}`}
                className={`flex items-center gap-3 rounded-2xl border p-3 ${has ? "border-success/40 bg-success/10" : "border-border bg-surface-muted/40"}`}
              >
                <span
                  className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold ${has ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {has ? "✓" : "•"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{label}</div>
                  <div className={`text-[11px] ${has ? "text-success" : "text-muted-foreground"}`}>
                    {has
                      ? lang === "en"
                        ? "Uploaded"
                        : "பதிவேற்றப்பட்டது"
                      : lang === "en"
                        ? "Not uploaded"
                        : "பதிவேற்றப்படவில்லை"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {missing.length > 0 && (
          <Link
            to="/upgrade"
            className="mt-4 inline-block text-xs font-semibold text-primary hover:underline"
          >
            {lang === "en"
              ? `Upload ${missing.length} missing →`
              : `${missing.length} ஆவணம் பதிவேற்ற →`}
          </Link>
        )}
      </InfoCard>

      {/* Process timeline */}
      <InfoCard
        className="mt-6"
        title={lang === "en" ? "Application Process" : "விண்ணப்ப செயல்முறை"}
        icon="🗺️"
      >
        <ol className="relative ml-3 border-l-2 border-dashed border-primary/40 pl-6">
          {(scheme.process || []).map((p: any, i: number) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="relative mb-5 last:mb-0"
            >
              <span className="absolute -left-[34px] grid h-7 w-7 place-items-center rounded-full gradient-hero text-xs font-bold text-primary-foreground shadow-glow">
                {i + 1}
              </span>
              <div className="text-sm">{p[lang]}</div>
            </motion.li>
          ))}
        </ol>
      </InfoCard>

      {/* Official site & deadline */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="glass rounded-3xl p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-primary">
            {lang === "en" ? "Official portal" : "அதிகாரப்பூர்வ தளம்"}
          </div>
          <a
            href={scheme.officialUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary"
          >
            🔗 {scheme.officialUrl}
          </a>
        </div>
        {scheme.deadline && (
          <div className="glass rounded-3xl p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-warning">
              {lang === "en" ? "Deadline" : "கடைசி தேதி"}
            </div>
            <div className="mt-2 text-lg font-display font-semibold">
              ⏳{" "}
              {new Date(scheme.deadline).toLocaleDateString(lang === "ta" ? "ta-IN" : "en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>
        )}
      </div>

      {scheme.faqs && scheme.faqs.length > 0 && (
        <InfoCard className="mt-6" title="FAQs" icon="💬">
          <div className="space-y-3">
            {(scheme.faqs || []).map((f: any, i: number) => (
              <details
                key={i}
                className="rounded-2xl bg-surface-muted/60 p-4 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="cursor-pointer text-sm font-semibold">{f.q[lang]}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{f.a[lang]}</p>
              </details>
            ))}
          </div>
        </InfoCard>
      )}

      {/* Apply */}
      <div className="mt-8 flex flex-col items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleApply}
          className={`rounded-2xl px-8 py-3 text-base font-semibold shadow-glow transition ${
            applied ? "bg-success text-success-foreground" : "gradient-hero text-primary-foreground"
          }`}
        >
          {applied
            ? lang === "en"
              ? "✓ Application submitted"
              : "✓ விண்ணப்பம் சமர்ப்பிக்கப்பட்டது"
            : lang === "en"
              ? "Apply Now"
              : "இப்போது விண்ணப்பி"}
        </motion.button>
        <p className="text-xs text-muted-foreground">
          {ready
            ? lang === "en"
              ? "All required documents are uploaded. Registration will be auto-filled."
              : "தேவையான ஆவணங்கள் தயார். தானியங்கி பதிவு."
            : lang === "en"
              ? "Some documents are missing — we'll show you the list."
              : "சில ஆவணங்கள் இல்லை."}
        </p>
      </div>

      <AnimatePresence>
        {showMissing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
            onClick={() => setShowMissing(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              className="glass-strong w-full max-w-md rounded-3xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display text-xl font-bold">
                {lang === "en" ? "Missing documents" : "இல்லாத ஆவணங்கள்"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {lang === "en"
                  ? "Please upload the following to proceed with auto-registration."
                  : "தானியங்கி பதிவுக்கு பதிவேற்றவும்."}
              </p>
              <ul className="my-5 space-y-2">
                {showMissing.map((d) => (
                  <li
                    key={d}
                    className="flex items-center gap-2 rounded-xl bg-surface-muted/70 px-3 py-2 text-sm"
                  >
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-muted text-xs">
                      •
                    </span>
                    {DOCUMENT_LABELS[d]?.[lang] || d}
                  </li>
                ))}
              </ul>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowMissing(null)}
                  className="rounded-xl px-3 py-2 text-sm"
                >
                  {lang === "en" ? "Close" : "மூடு"}
                </button>
                <button
                  onClick={() => {
                    setShowMissing(null);
                    navigate({ to: "/upgrade" });
                  }}
                  className="rounded-xl gradient-hero px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  {lang === "en" ? "Upload now →" : "பதிவேற்று →"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-10">
        <h3 className="mb-3 font-display text-lg font-semibold">
          {lang === "en" ? "Scheme-specific AI Assistant" : "திட்ட சார்ந்த AI"}
        </h3>
        <div className="glass rounded-3xl p-5 text-sm text-muted-foreground">
          {lang === "en"
            ? "Tap the floating assistant — it's context-aware for this scheme."
            : "மிதக்கும் உதவியாளரை அழுத்துங்கள் — இந்த திட்டத்திற்கான பதில்கள்."}
        </div>
      </div>

      {/* Override the global chatbot with contextual label */}
      <AIChatbot contextLabel={scheme.name.en} />
    </AppShell>
  );
}

function InfoCard({
  title,
  children,
  className = "",
}: {
  title: string;
  icon?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4 }}
      className={`glass shadow-card rounded-3xl p-6 ${className}`}
    >
      <div className="mb-4 flex items-center gap-3">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </motion.section>
  );
}

function EligibilityBadge({ ready, lang }: { ready: boolean; lang: "en" | "ta" }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${ready ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}
    >
      <span className={`h-2 w-2 rounded-full ${ready ? "bg-success" : "bg-warning"}`} />
      {ready
        ? lang === "en"
          ? "Ready to apply"
          : "விண்ணப்பிக்க தயார்"
        : lang === "en"
          ? "Documents needed"
          : "ஆவணங்கள் தேவை"}
    </div>
  );
}
