import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { SCHEMES } from "@/lib/data";
import { app, useApp } from "@/lib/store";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — WelfareIntel" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, lang, savedSchemes, appliedSchemes, scannedDocuments } = useApp();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const showUser = mounted && user;
  const initials = showUser
    ? (user.name || "U")
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  const saved = SCHEMES.filter((s) => savedSchemes.includes(s.id));
  const applied = SCHEMES.filter((s) => appliedSchemes.includes(s.id));

  const userDocs = Object.entries(scannedDocuments || {}).filter(([_, doc]) => doc.owner === user?.email);

  return (
    <AppShell>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong flex flex-wrap items-center gap-6 rounded-3xl p-8"
      >
        <div className="overflow-hidden grid h-24 w-24 place-items-center rounded-3xl gradient-hero text-3xl font-display font-bold text-primary-foreground shadow-glow">
          {showUser && user?.photo ? (
            <img src={user.photo} alt={user.name} className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-3xl font-bold">{showUser ? user.name : "Citizen"}</h1>
          <p className="text-sm text-muted-foreground">{showUser ? user.email : ""}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Stat label={lang === "en" ? "Saved" : "சேமித்தவை"} value={saved.length} />
            <Stat label={lang === "en" ? "Applied" : "விண்ணப்பித்தவை"} value={applied.length} />
          </div>
        </div>
        <button
          onClick={() => app.logout()}
          className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-muted"
        >
          {lang === "en" ? "Sign out" : "வெளியேறு"}
        </button>
      </motion.div>

      <Section title={lang === "en" ? "Settings" : "அமைப்புகள்"}>
        <div className="glass rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{lang === "en" ? "Language" : "மொழி"}</div>
              <div className="text-xs text-muted-foreground">
                {lang === "en" ? "Interface language preference" : "இடைமுகம் மொழி"}
              </div>
            </div>
            <div className="flex gap-1 rounded-xl bg-surface-muted p-1">
              {(["en", "ta"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => app.setLang(l)}
                  className={`relative rounded-lg px-3 py-1.5 text-xs font-semibold ${lang === l ? "text-primary-foreground" : "text-muted-foreground"}`}
                >
                  {lang === l && (
                    <motion.span
                      layoutId="lang-pill"
                      className="absolute inset-0 rounded-lg gradient-hero"
                    />
                  )}
                  <span className="relative">{l === "en" ? "English" : "தமிழ்"}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title={lang === "en" ? "Scanned Profile Data" : "ஸ்கேன் செய்யப்பட்ட தரவு"}>
        {userDocs.length === 0 ? (
          <Empty text={lang === "en" ? "No scanned documents found." : "ஸ்கேன் செய்யப்பட்ட ஆவணங்கள் இல்லை."} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {userDocs.map(([docKey, doc]) => (
              <ScannedDocCard key={docKey} docKey={docKey} doc={doc} lang={lang} />
            ))}
          </div>
        )}
      </Section>

      <Section title={lang === "en" ? "Saved schemes" : "சேமித்த திட்டங்கள்"}>
        {saved.length === 0 ? (
          <Empty
            text={lang === "en" ? "You haven't saved anything yet." : "எதையும் சேமிக்கவில்லை."}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {saved.map((s) => (
              <Row key={s.id} id={s.id} title={s.name.en} sub={s.name.ta} />
            ))}
          </div>
        )}
      </Section>

      <Section title={lang === "en" ? "Applied schemes" : "விண்ணப்பித்த திட்டங்கள்"}>
        {applied.length === 0 ? (
          <Empty text={lang === "en" ? "No applications yet." : "விண்ணப்பங்கள் இல்லை."} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {applied.map((s) => (
              <Row key={s.id} id={s.id} title={s.name.en} sub={s.name.ta} status="Applied" />
            ))}
          </div>
        )}
      </Section>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-full bg-surface-muted px-3 py-1 text-muted-foreground">
      <span className="font-semibold text-foreground">{value}</span> {label}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">{text}</div>
  );
}
function Row({
  id,
  title,
  sub,
  status,
}: {
  id: string;
  title: string;
  sub: string;
  status?: string;
}) {
  return (
    <Link
      to="/scheme/$id"
      params={{ id }}
      className="glass shadow-card flex items-center justify-between rounded-2xl p-4 transition hover:-translate-y-0.5"
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{title}</div>
        <div className="truncate text-[11px] text-muted-foreground" lang="ta">
          {sub}
        </div>
      </div>
      {status && (
        <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-semibold text-success">
          {status}
        </span>
      )}
    </Link>
  );
}

function ScannedDocCard({ docKey, doc, lang }: { docKey: string; doc: any; lang: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  const startEdit = () => {
    const initial: Record<string, string> = {};
    doc.fields.forEach((f: any) => (initial[f.key] = f.value));
    setValues(initial);
    setIsEditing(true);
  };

  const saveEdit = () => {
    Object.entries(values).forEach(([key, val]) => {
      app.updateScannedField(docKey, key, val);
    });
    setIsEditing(false);
  };

  return (
    <div className="glass shadow-card rounded-2xl p-5 hover:border-primary/30 transition relative">
      <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
        <div className="font-display font-semibold">{doc.documentTypeLabel}</div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {new Date(doc.scannedAt).toLocaleDateString()}
          </span>
          {isEditing ? (
            <button
              onClick={saveEdit}
              className="rounded-md bg-success/15 px-2 py-1 text-xs font-semibold text-success hover:bg-success/25 transition"
            >
              {lang === "en" ? "Save" : "சேமி"}
            </button>
          ) : (
            <button
              onClick={startEdit}
              className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition"
            >
              {lang === "en" ? "Edit" : "திருத்து"}
            </button>
          )}
        </div>
      </div>
      <div className="space-y-3">
        {doc.fields.map((field: any) => (
          <div key={field.key} className="text-sm">
            <div className="text-xs text-muted-foreground">{field.label}</div>
            {isEditing ? (
              <input
                type="text"
                value={values[field.key] ?? field.value}
                onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-card px-2 py-1 text-sm font-medium outline-none focus:border-primary transition"
              />
            ) : (
              <div className="font-medium text-foreground">{field.value}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
