import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { z } from "zod";
import { app, useApp } from "@/lib/store";
import { API_BASE_URL } from "@/lib/api";

const searchSchema = z.object({
  mode: z.enum(["signin", "login"]).optional(),
  email: z.string().optional(),
  name: z.string().optional(),
  picture: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — WelfareIntel" }] }),
  component: AuthPage,
});

function AuthPage() {
  const {
    mode = "login",
    email: queryEmail,
    name: queryName,
    picture: queryPicture,
  } = Route.useSearch();
  const navigate = useNavigate();
  const { lang } = useApp();
  const [tab, setTab] = useState<"signin" | "login">(mode);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (queryEmail) {
      console.log("auth.tsx queryPicture:", queryPicture);
      app.login(queryEmail, queryName || undefined, queryPicture || undefined);
      navigate({ to: "/dashboard" });
    }
  }, [queryEmail, queryName, queryPicture, navigate]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    app.login(email, name || undefined);
    navigate({ to: "/dashboard" });
  };

  const googleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google/login`;
  };

  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-strong w-full max-w-md rounded-3xl p-8"
      >
        <div className="mb-6 flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl gradient-hero">
            <span className="font-display text-lg font-bold text-primary-foreground">W</span>
          </div>
          <span className="font-display text-lg font-semibold">WelfareIntel</span>
        </div>
        <h1 className="font-display text-2xl font-bold">
          {tab === "signin"
            ? lang === "en"
              ? "Create your account"
              : "புதிய கணக்கு"
            : lang === "en"
              ? "Welcome back"
              : "மீண்டும் வரவேற்கிறோம்"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {lang === "en"
            ? "Access Tamil Nadu welfare in seconds."
            : "தமிழ்நாடு சலுகைகளை விரைவாக அணுகுங்கள்."}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-surface-muted p-1">
          {(["login", "signin"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setTab(m)}
              className={`relative rounded-xl px-3 py-2 text-sm font-semibold transition ${
                tab === m ? "text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {tab === m && (
                <motion.span
                  layoutId="auth-tab"
                  className="absolute inset-0 rounded-xl gradient-hero"
                />
              )}
              <span className="relative">{m === "login" ? "Login" : "Sign Up"}</span>
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-3">
          {tab === "signin" && (
            <Field label={lang === "en" ? "Full name" : "முழுப் பெயர்"}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="field-input"
                placeholder="Arun Kumar"
              />
            </Field>
          )}
          <Field label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field-input"
              placeholder="you@example.com"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field-input"
              placeholder="••••••••"
            />
          </Field>
          <button className="mt-2 w-full rounded-xl gradient-hero py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:-translate-y-0.5">
            {tab === "signin"
              ? lang === "en"
                ? "Create account"
                : "உருவாக்கு"
              : lang === "en"
                ? "Login"
                : "உள்நுழை"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          {lang === "en" ? "or" : "அல்லது"}
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          onClick={googleLogin}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-sm font-medium transition hover:bg-surface-muted"
        >
          <span className="text-base">🇬</span>{" "}
          {lang === "en" ? "Continue with Google" : "Google மூலம் தொடரவும்"}
        </button>
      </motion.div>
      <style>{`.field-input{width:100%;border-radius:12px;border:1px solid var(--input);background:var(--card);padding:.6rem .75rem;font-size:.875rem;outline:none}.field-input:focus{box-shadow:0 0 0 3px color-mix(in oklab,var(--ring) 30%,transparent)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
