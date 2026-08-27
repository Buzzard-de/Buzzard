"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/context";
import { CONTACT_EMAIL } from "@/lib/site/contact";
import { SITE_URL } from "@/lib/seo/config";
import { canSubmitForm, isValidEmail, markFormSubmitted } from "@/lib/security";

const RATE_LIMIT_KEY = "buzzard_newsletter_last";

export default function HomeNewsletter() {
  const { t } = useLocale();
  const [message, setMessage] = useState("");
  const [messageColor, setMessageColor] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("newsletter") === "1") {
      setMessageColor("#c9a840");
      setMessage("Vielen Dank! Sie erhalten Neuigkeiten von Buzzard24.");
    }
  }, []);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    setMessage("");

    const form = e.currentTarget;
    const honey = (form.elements.namedItem("_honey") as HTMLInputElement)?.value;
    if (honey) {
      e.preventDefault();
      return;
    }

    if (!canSubmitForm(RATE_LIMIT_KEY)) {
      e.preventDefault();
      setMessageColor("#e8a0a0");
      setMessage("Bitte warten Sie eine Minute, bevor Sie erneut anmelden.");
      return;
    }

    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    if (!isValidEmail(email)) {
      e.preventDefault();
      setMessageColor("#e8a0a0");
      setMessage("Bitte geben Sie eine gültige E-Mail ein.");
      return;
    }

    markFormSubmitted(RATE_LIMIT_KEY);
  }

  const nextUrl = `${SITE_URL}/?newsletter=1`;

  return (
    <section className="home-section home-newsletter" aria-labelledby="home-newsletter-title">
      <div className="home-newsletter-inner">
        <h2 id="home-newsletter-title">{t("home.newsletter")}</h2>
        <p>{t("home.newsletterText")}</p>
        <form
          className="home-newsletter-form"
          action={`https://formsubmit.co/${encodeURIComponent(CONTACT_EMAIL)}`}
          method="POST"
          onSubmit={handleSubmit}
        >
          <input type="hidden" name="_subject" value="Buzzard Newsletter-Anmeldung" />
          <input type="hidden" name="_template" value="table" />
          <input type="hidden" name="_captcha" value="false" />
          <input type="hidden" name="_next" value={nextUrl} />
          <input type="text" name="_honey" tabIndex={-1} autoComplete="off" style={{ display: "none" }} aria-hidden="true" />
          <input
            type="email"
            name="email"
            placeholder={t("home.newsletterPlaceholder")}
            aria-label={t("home.newsletterPlaceholder")}
            maxLength={254}
            required
          />
          <button type="submit">{t("home.newsletterBtn")}</button>
        </form>
        {message && (
          <p className="home-newsletter-msg" style={{ color: messageColor || undefined }}>
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
