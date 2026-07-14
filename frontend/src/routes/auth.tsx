import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { z } from "zod";
import { app, useApp } from "@/lib/store";
import { API_BASE_URL } from "@/lib/api";

const searchSchema = z.object({
  mode: z.string().optional(),
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
    email: queryEmail,
    name: queryName,
    picture: queryPicture,
  } = Route.useSearch();
  const navigate = useNavigate();
  const { lang } = useApp();

  useEffect(() => {
    if (queryEmail) {
      console.log("auth.tsx queryPicture:", queryPicture);
      app.login(queryEmail, queryName || undefined, queryPicture || undefined);
      navigate({ to: "/dashboard" });
    }
  }, [queryEmail, queryName, queryPicture, navigate]);

  const googleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google/login`;
  };

  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-10 overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-accent/20 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="glass-strong relative z-10 w-full max-w-md rounded-3xl p-8 shadow-2xl border border-border/80 text-center"
      >
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl gradient-hero shadow-glow">
          <span className="font-display text-2xl font-bold text-primary-foreground">W</span>
        </div>

        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <span>✨</span>
          <span>{lang === "en" ? "Secure Citizen Portal" : "பாதுகாப்பான குடிமக்கள் தளம்"}</span>
        </div>

        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {lang === "en" ? "Welcome to WelfareIntel" : "WelfareIntel-க்கு வரவேற்கிறோம்"}
        </h1>

        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {lang === "en"
            ? "Sign in with your verified Google account to check eligibility, scan identity documents, and instantly apply for Tamil Nadu welfare schemes."
            : "தமிழ்நாடு அரசு நலத்திட்டங்கள் மற்றும் உதவித்தொகைகளை விரைவாக கண்டறிந்து விண்ணப்பிக்க உங்கள் Google கணக்கு மூலம் உள்நுழையவும்."}
        </p>

        <div className="mt-8">
          <button
            onClick={googleLogin}
            className="group relative flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card px-5 py-3.5 text-sm font-semibold text-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-surface-muted hover:shadow-md active:translate-y-0"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{lang === "en" ? "Sign in with Google" : "Google கணக்கு மூலம் உள்நுழையவும்"}</span>
          </button>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            {lang === "en"
              ? "100% Free & Secure Citizen Service"
              : "100% இலவச மற்றும் பாதுகாப்பான சேவை"}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
