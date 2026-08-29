"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  LIMITS,
  canSubmitForm,
  clampText,
  isValidEmail,
  markFormSubmitted,
} from "@/lib/security";
import { CONTACT_EMAIL } from "@/lib/site/contact";
import { SITE_URL } from "@/lib/seo/config";
import { useLocale } from "@/lib/i18n/context";

const RATE_LIMIT_KEY = "buzzard_contact_last";
const MIN_SUBMIT_MS = 1500;

export default function ContactForm() {
  const pathname = usePathname();
  const { t } = useLocale();
  const [message, setMessage] = useState("");
  const [messageColor, setMessageColor] = useState("");
  const [formStartedAt] = useState(() => Date.now());

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("sent") === "1") {
      setMessageColor("#c9a840");
      setMessage(t("contactForm.success"));
    }
  }, [t]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    setMessage("");

    const form = e.currentTarget;
    const honey = (form.elements.namedItem("_honey") as HTMLInputElement)?.value;
    const website = (form.elements.namedItem("_website") as HTMLInputElement)?.value;
    if (honey || website) {
      e.preventDefault();
      return;
    }

    if (Date.now() - formStartedAt < MIN_SUBMIT_MS) {
      e.preventDefault();
      setMessageColor("#e8a0a0");
      setMessage(t("contactForm.errorTooFast"));
      return;
    }

    if (!canSubmitForm(RATE_LIMIT_KEY)) {
      e.preventDefault();
      setMessageColor("#e8a0a0");
      setMessage(t("contactForm.errorRateLimit"));
      return;
    }

    const name = clampText((form.elements.namedItem("name") as HTMLInputElement).value, LIMITS.name);
    const email = clampText((form.elements.namedItem("email") as HTMLInputElement).value, LIMITS.email);
    const msg = clampText((form.elements.namedItem("message") as HTMLTextAreaElement).value, LIMITS.message);

    if (!name || !email || !msg) {
      e.preventDefault();
      setMessageColor("#e8a0a0");
      setMessage(t("contactForm.errorRequired"));
      return;
    }

    if (!isValidEmail(email)) {
      e.preventDefault();
      setMessageColor("#e8a0a0");
      setMessage(t("contactForm.errorEmail"));
      return;
    }

    markFormSubmitted(RATE_LIMIT_KEY);
  }

  const returnPath = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const nextUrl = `${SITE_URL}${returnPath}?sent=1`;

  return (
    <>
      <form
        id="contactForm"
        action={`https://formsubmit.co/${encodeURIComponent(CONTACT_EMAIL)}`}
        method="POST"
        onSubmit={handleSubmit}
        noValidate
      >
        <input type="hidden" name="_subject" value="Buzzard Kontaktanfrage" />
        <input type="hidden" name="_template" value="table" />
        <input type="hidden" name="_captcha" value="false" />
        <input type="hidden" name="_next" value={nextUrl} />
        <input type="text" name="_honey" tabIndex={-1} autoComplete="off" style={{ display: "none" }} aria-hidden="true" />
        <input type="text" name="_website" tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: "-9999px" }} aria-hidden="true" />
        <label htmlFor="name">{t("contactForm.nameLabel")}</label>
        <input id="name" name="name" type="text" placeholder={t("contactForm.namePlaceholder")} autoComplete="name" required maxLength={LIMITS.name} />
        <label htmlFor="email">{t("contactForm.emailLabel")}</label>
        <input id="email" name="email" type="email" placeholder={t("contactForm.emailPlaceholder")} autoComplete="email" required maxLength={LIMITS.email} />
        <label htmlFor="message">{t("contactForm.messageLabel")}</label>
        <textarea id="message" name="message" rows={5} placeholder={t("contactForm.messagePlaceholder")} required maxLength={LIMITS.message} />
        <button type="submit" className="contact-form-btn">
          {t("contactForm.submit")}
        </button>
        <div id="formMessage" className="contact-form-msg" role="status" aria-live="polite" style={{ color: messageColor || undefined }}>
          {message}
        </div>
      </form>
      <p className="contact-form-alt">
        {t("contactForm.altEmail")}{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </>
  );
}
