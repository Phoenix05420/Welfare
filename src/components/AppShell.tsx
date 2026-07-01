import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { app, useApp } from "@/lib/store";
import { AIChatbot } from "./AIChatbot";

const NAV = [
  { to: "/dashboard", label: { en: "Dashboard", ta: "முகப்பு" } },
  { to: "/document-scanner", label: { en: "Scan Document", ta: "ஆவண ஸ்கேனர்" } },
  { to: "/benefits", label: { en: "Benefits", ta: "சலுகைகள்" } },
  { to: "/featured-schemes", label: { en: "Featured Schemes", ta: "சிறப்பு திட்டங்கள்" } },
  { to: "/upgrade", label: { en: "Upgrade", ta: "மேம்படுத்து" } },
] as const;

export function AppShell({
  children,
  hideChatbot = false,
}: {
  children: ReactNode;
  hideChatbot?: boolean;
}) {
  const state = useApp();
  console.log("AppShell state.user:", state.user);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Mock auth guard (client only)
    if (typeof window === "undefined") return;
    if (mounted && !state.user) navigate({ to: "/auth" });
  }, [state.user, navigate, mounted]);

  const lang = state.lang;
  const showUser = mounted && state.user;
  const initials = state.user
    ? (state.user.name || "U")
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 px-4 pt-4">
        <motion.nav
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="glass-strong mx-auto flex max-w-7xl items-center justify-between rounded-2xl px-5 py-3"
        >
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl gradient-hero shadow-glow">
              <span className="font-display text-lg font-bold text-primary-foreground">W</span>
            </div>
            <span className="font-display text-lg font-semibold tracking-tight">WelfareIntel</span>
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active =
                pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`relative rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-xl bg-primary-soft"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative">{item.label[lang]}</span>
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => app.setLang(lang === "en" ? "ta" : "en")}
              className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-surface-muted"
              aria-label="Toggle language"
            >
              {lang === "en" ? "தமிழ்" : "EN"}
            </button>
            <Link
              to="/profile"
              className="overflow-hidden grid h-9 w-9 place-items-center rounded-full gradient-hero text-sm font-semibold text-primary-foreground shadow-card"
            >
              {showUser && state.user?.photo ? (
                <img
                  src={state.user.photo}
                  alt={state.user.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </Link>
          </div>
        </motion.nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      {!hideChatbot && <AIChatbot />}
    </div>
  );
}
