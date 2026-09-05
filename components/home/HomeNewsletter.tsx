"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/context";
import { submitContact } from "@/lib/contact/client";
import { isApiConfigured } from "@/lib/api/config";
import { canSubmitForm, isValidEmail, markFormSubmitted } from "@/lib/security";

const RATE_LIMIT_KEY = "buzzard_newsletter_last";

export default function HomeNewsletter() {
  const router = useRouter();
  const { t } = useLocale();
  const [message, setMessage] = useState("");
  const [messageColor, setMessageColor] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    const form = e.currentTarget;
    const honey = (form.elements.namedItem("_honey") as HTMLInputElement)?.value;
    if (honey) return;

    if (!canSubmitForm(RATE_LIMIT_KEY)) {
      setMessageColor("#e8a0a0");
      setMessage(t("home.newsletterRateLimit"));
      return;
    }

    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    if (!isValidEmail(email)) {
      setMessageColor("#e8a0a0");
      setMessage(t("home.newsletterInvalid"));
      return;
    }

    if (!isApiConfigured()) {
      setMessageColor("#e8a0a0");
      setMessage(t("home.newsletterUnavailable"));
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitContact({
        name: "Newsletter",
        email,
        message: "Newsletter-Anmeldung über Startseite",
        formStarted: Date.now(),
      });

      if (!result.ok) {
        setMessageColor("#e8a0a0");
        setMessage(result.message || t("home.newsletterError"));
        return;
      }

      markFormSubmitted(RATE_LIMIT_KEY);
      router.replace("/?newsletter=1");
      setMessageColor("#c9a840");
      setMessage(t("home.newsletterSuccess"));
      form.reset();
    } catch {
      setMessageColor("#e8a0a0");
      setMessage(t("home.newsletterError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="home-section home-newsletter" aria-labelledby="home-newsletter-title">
      <div className="home-newsletter-inner">
        <h2 id="home-newsletter-title">{t("home.newsletter")}</h2>
        <p>{t("home.newsletterText")}</p>
        <form className="home-newsletter-form" onSubmit={handleSubmit} noValidate>
          <input type="text" name="_honey" tabIndex={-1} autoComplete="off" style={{ display: "none" }} aria-hidden="true" />
          <input
            type="email"
            name="email"
            placeholder={t("home.newsletterPlaceholder")}
            aria-label={t("home.newsletterPlaceholder")}
            maxLength={254}
            required
            disabled={submitting}
          />
          <button type="submit" disabled={submitting}>
            {submitting ? t("home.newsletterSubmitting") : t("home.newsletterBtn")}
          </button>
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
