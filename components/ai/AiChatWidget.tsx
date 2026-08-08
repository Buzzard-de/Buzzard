"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { sendAiChatMessage } from "@/lib/ai/client";
import type { AiChatMessage, AiChatProduct } from "@/lib/ai/types";
import { useLocale } from "@/lib/i18n/context";
import { isRtlLocale } from "@/lib/i18n";
import { isAiChatEnabled } from "@/lib/api/config";
import { trackMarketingEvent } from "@/lib/marketing/events";

const SESSION_KEY = "buzzard_ai_chat_session";

export default function AiChatWidget() {
  const { t, locale } = useLocale();
  const rtl = isRtlLocale(locale);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [products, setProducts] = useState<AiChatProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) setSessionId(saved);
  }, []);

  useEffect(() => {
    if (!open) return;
    trackMarketingEvent("ai_chat_open", { locale });
  }, [open, locale]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(preset?: string) {
    const text = (preset || input).trim();
    if (!text || loading) return;
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      const response = await sendAiChatMessage({
        message: text,
        sessionId,
        locale,
      });
      if (response.sessionId) {
        setSessionId(response.sessionId);
        sessionStorage.setItem(SESSION_KEY, response.sessionId);
      }
      setMessages((prev) => [...prev, { role: "assistant", content: response.reply }]);
      setProducts(response.products || []);
      trackMarketingEvent("ai_chat_message", { locale, intent: response.intent || "unknown" });
    } catch {
      setError(t("ai.chat.error"));
    } finally {
      setLoading(false);
    }
  }

  function handleEscalate() {
    handleSend(t("ai.chat.escalate"));
  }

  if (!isAiChatEnabled()) return null;

  return (
    <>
      <button
        type="button"
        className={`ai-chat-fab${open ? " open" : ""}`}
        aria-expanded={open}
        aria-controls="buzzard-ai-chat"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? t("ai.chat.close") : t("ai.chat.open")}
      </button>

      {open ? (
        <section
          id="buzzard-ai-chat"
          className={`ai-chat-panel${rtl ? " rtl" : ""}`}
          dir={rtl ? "rtl" : "ltr"}
          role="dialog"
          aria-label={t("ai.chat.title")}
        >
          <header className="ai-chat-header">
            <div>
              <strong>{t("ai.chat.title")}</strong>
              <small>{t("ai.chat.subtitle")}</small>
            </div>
            <button type="button" className="ai-chat-close" onClick={() => setOpen(false)} aria-label={t("ai.chat.close")}>
              ×
            </button>
          </header>

          <div className="ai-chat-messages" ref={listRef}>
            {messages.length === 0 ? <p className="ai-chat-disclaimer">{t("ai.chat.disclaimer")}</p> : null}
            {messages.map((msg, idx) => (
              <div key={`${msg.role}-${idx}`} className={`ai-chat-bubble ${msg.role}`}>
                {msg.content.split("\n").map((line, lineIdx) => (
                  <p key={lineIdx}>{line}</p>
                ))}
              </div>
            ))}
            {loading ? <p className="ai-chat-thinking">{t("ai.chat.thinking")}</p> : null}
            {error ? <p className="ai-chat-error">{error}</p> : null}
          </div>

          {products.length > 0 ? (
            <div className="ai-chat-products">
              {products.map((product) => (
                <Link key={product.id} href={product.url} className="ai-chat-product">
                  <span>{product.name}</span>
                  {typeof product.price === "number" ? <small>{product.price.toFixed(2)} €</small> : null}
                </Link>
              ))}
            </div>
          ) : null}

          <form
            className="ai-chat-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("ai.chat.placeholder")}
              aria-label={t("ai.chat.placeholder")}
              maxLength={2000}
            />
            <button type="submit" className="shop-btn-primary" disabled={loading || !input.trim()}>
              {t("ai.chat.send")}
            </button>
          </form>

          <button type="button" className="ai-chat-escalate" onClick={handleEscalate}>
            {t("ai.chat.escalate")}
          </button>
        </section>
      ) : null}
    </>
  );
}
