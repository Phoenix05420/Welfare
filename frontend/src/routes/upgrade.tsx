import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useRef } from "react";
import { AppShell } from "@/components/AppShell";
import { DOCUMENT_KEYS, DOCUMENT_LABELS, type DocKey } from "@/lib/data";
import { app, useApp } from "@/lib/store";

export const Route = createFileRoute("/upgrade")({
  head: () => ({ meta: [{ title: "Upgrade — WelfareIntel" }] }),
  component: UpgradePage,
});

function UpgradePage() {
  const { lang, uploadedDocs } = useApp();
  const uploaded = DOCUMENT_KEYS.filter((d) => uploadedDocs[d]).length;
  const pct = Math.round((uploaded / DOCUMENT_KEYS.length) * 100);

  return (
    <AppShell>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-block rounded-full bg-accent/40 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              {lang === "en" ? "Registration Automation" : "தானியங்கி பதிவு"}
            </span>
            <h1 className="mt-3 font-display text-3xl font-bold md:text-4xl">
              {lang === "en" ? "Unlock one-tap applications" : "ஒரே தொடுதலில் விண்ணப்பம்"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {lang === "en"
                ? "Upload your documents once. WelfareIntel auto-fills government forms and submits with stored details — securely on your device."
                : "ஆவணங்களை ஒரே முறை பதிவேற்றுங்கள். WelfareIntel தானாகவே படிவங்களை நிரப்பும்."}
            </p>
          </div>
          <div className="w-full max-w-xs">
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{lang === "en" ? "Profile readiness" : "தயார்நிலை"}</span>
              <span className="font-semibold text-foreground">{pct}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted">
              <motion.div
                className="h-full gradient-hero"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DOCUMENT_KEYS.map((k, i) => (
          <DocCard key={k} keyId={k} index={i} />
        ))}
      </div>
    </AppShell>
  );
}

function DocCard({ keyId, index }: { keyId: DocKey; index: number }) {
  const { lang, uploadedDocs } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const doc = uploadedDocs[keyId];
  const label = DOCUMENT_LABELS[keyId];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`glass shadow-card rounded-3xl p-5 ${doc ? "ring-1 ring-success/40" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display font-semibold">{label.en}</div>
          <div className="text-[11px] text-muted-foreground" lang="ta">
            {label.ta}
          </div>
        </div>
        <span
          className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold ${doc ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}
        >
          {doc ? "✓" : "•"}
        </span>
      </div>
      {doc ? (
        <div className="mt-4 rounded-xl bg-success/10 p-3 text-xs text-success">
          <div className="truncate font-medium">{doc.name}</div>
          <div className="text-[10px] opacity-80">
            {new Date(doc.uploadedAt).toLocaleDateString()}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-surface-muted/60 p-3 text-xs text-muted-foreground">
          {lang === "en" ? "No file uploaded yet." : "எதுவும் பதிவேற்றப்படவில்லை."}
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) app.uploadDoc(keyId, f.name);
            e.currentTarget.value = "";
          }}
        />
        <button
          onClick={() => inputRef.current?.click()}
          className="flex-1 rounded-xl gradient-hero px-3 py-2 text-xs font-semibold text-primary-foreground"
        >
          {doc ? (lang === "en" ? "Replace" : "மாற்று") : lang === "en" ? "Upload" : "பதிவேற்று"}
        </button>
        {doc && (
          <button
            onClick={() => app.removeDoc(keyId)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-destructive"
          >
            {lang === "en" ? "Remove" : "நீக்கு"}
          </button>
        )}
      </div>
    </motion.div>
  );
}
