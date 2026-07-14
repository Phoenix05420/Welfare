import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { API_BASE_URL } from "@/lib/api";

type Msg = { role: "user" | "ai"; text: string };

const QUICK = {
  en: [
    "Am I eligible?",
    "Which documents are missing?",
    "Recommend scholarships",
    "How long does approval take?",
  ],
  ta: ["நான் தகுதியா?", "என்ன ஆவணம் இல்லை?", "உதவித்தொகை பரிந்துரை", "ஒப்புதலுக்கு எவ்வளவு நேரம்?"],
};



export function AIChatbot({ contextLabel }: { contextLabel?: string }) {
  const { lang } = useApp();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "ai",
      text:
        lang === "en"
          ? `Hi! I'm your AI assistant${contextLabel ? ` for ${contextLabel}` : ""}. How can I help?`
          : `வணக்கம்! நான் உங்கள் AI உதவியாளர்${contextLabel ? ` (${contextLabel})` : ""}. எப்படி உதவ வேண்டும்?`,
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const next: Msg[] = [...messages, { role: "user", text }];
    setMessages(next);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          lang: lang
        })
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setMessages([...next, { role: "ai", text: data.reply }]);
    } catch (e) {
      console.error(e);
      setMessages([...next, { role: "ai", text: lang === "en" ? "Sorry, I am having trouble connecting." : "மன்னிக்கவும், தொடர்பு கொள்ள முடியவில்லை." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-40 grid h-14 w-14 place-items-center rounded-2xl gradient-hero text-2xl text-primary-foreground shadow-glow"
        aria-label="Open AI assistant"
      >
        {open ? "✕" : "🤖"}
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="glass-strong fixed bottom-24 right-6 z-40 flex h-[28rem] w-[22rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-3xl"
          >
            <div className="border-b border-border/60 px-4 py-3">
              <div className="text-sm font-semibold">
                {lang === "en" ? "AI Assistant" : "AI உதவியாளர்"}
              </div>
              {contextLabel && <div className="text-xs text-muted-foreground">{contextLabel}</div>}
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface-muted text-foreground"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border/60 px-3 py-2">
              <div className="mb-2 flex flex-wrap gap-1">
                {QUICK[lang].map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={lang === "en" ? "Ask anything…" : "எதையும் கேளுங்கள்…"}
                  className="flex-1 rounded-xl border border-input bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button disabled={isLoading} className="rounded-xl gradient-hero px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                  {isLoading ? "..." : "↑"}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
