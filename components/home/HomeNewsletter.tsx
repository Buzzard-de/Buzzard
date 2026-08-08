"use client";

import { FormEvent, useState } from "react";
import { useLocale } from "@/lib/i18n/context";

export default function HomeNewsletter() {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      setMessage("Bitte geben Sie eine gültige E-Mail ein.");
      return;
    }
    setMessage("Vielen Dank! Sie erhalten bald Neuigkeiten von Buzzard.");
    setEmail("");
  }

  return (
    <section className="home-section home-newsletter" aria-labelledby="home-newsletter-title">
      <div className="home-newsletter-inner">
        <h2 id="home-newsletter-title">{t("home.newsletter")}</h2>
        <p>{t("home.newsletterText")}</p>
        <form className="home-newsletter-form" onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("home.newsletterPlaceholder")}
            aria-label={t("home.newsletterPlaceholder")}
            maxLength={254}
          />
          <button type="submit">{t("home.newsletterBtn")}</button>
        </form>
        {message && <p className="home-newsletter-msg">{message}</p>}
      </div>
    </section>
  );
}
