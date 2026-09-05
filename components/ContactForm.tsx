"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LIMITS,
  canSubmitForm,
  clampText,
  isValidEmail,
  markFormSubmitted,
} from "@/lib/security";
import { submitContact } from "@/lib/contact/client";
import { isApiConfigured } from "@/lib/api/config";
import { CONTACT_EMAIL } from "@/lib/site/contact";
import { useLocale } from "@/lib/i18n/context";

const RATE_LIMIT_KEY = "buzzard_contact_last";
const MIN_SUBMIT_MS = 1500;

export default function ContactForm() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLocale();
  const [message, setMessage] = useState("");
  const [messageColor, setMessageColor] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formStartedAt] = useState(() => Date.now());
  const [prefillMessage, setPrefillMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("sent") === "1") {
      setMessageColor("#c9a840");
      setMessage(t("contactForm.success"));
    }
    const inquiryMessage = params.get("message");
    if (inquiryMessage) {
      setPrefillMessage(decodeURIComponent(inquiryMessage));
    }
  }, [t]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    const form = e.currentTarget;
    const honey = (form.elements.namedItem("_honey") as HTMLInputElement)?.value;
    const website = (form.elements.namedItem("_website") as HTMLInputElement)?.value;
    if (honey || website) return;

    if (Date.now() - formStartedAt < MIN_SUBMIT_MS) {
      setMessageColor("#e8a0a0");
      setMessage(t("contactForm.errorTooFast"));
      return;
    }

    if (!canSubmitForm(RATE_LIMIT_KEY)) {
      setMessageColor("#e8a0a0");
      setMessage(t("contactForm.errorRateLimit"));
      return;
    }

    const name = clampText((form.elements.namedItem("name") as HTMLInputElement).value, LIMITS.name);
    const email = clampText((form.elements.namedItem("email") as HTMLInputElement).value, LIMITS.email);
    const msg = clampText((form.elements.namedItem("message") as HTMLTextAreaElement).value, LIMITS.message);

    if (!name || !email || !msg) {
      setMessageColor("#e8a0a0");
      setMessage(t("contactForm.errorRequired"));
      return;
    }

    if (!isValidEmail(email)) {
      setMessageColor("#e8a0a0");
      setMessage(t("contactForm.errorEmail"));
      return;
    }

    if (!isApiConfigured()) {
      setMessageColor("#e8a0a0");
      setMessage(t("contactForm.errorApi"));
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitContact({
        name,
        email,
        message: msg,
        formStarted: formStartedAt,
        honey,
        website,
      });

      if (!result.ok) {
        setMessageColor("#e8a0a0");
        setMessage(result.message || t("contactForm.errorServer"));
        return;
      }

      markFormSubmitted(RATE_LIMIT_KEY);
      const returnPath = pathname.endsWith("/") ? pathname : `${pathname}/`;
      router.replace(`${returnPath}?sent=1`);
      setMessageColor("#c9a840");
      setMessage(t("contactForm.success"));
      form.reset();
    } catch {
      setMessageColor("#e8a0a0");
      setMessage(t("contactForm.errorServer"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <form id="contactForm" onSubmit={handleSubmit} noValidate>
        <input type="text" name="_honey" tabIndex={-1} autoComplete="off" style={{ display: "none" }} aria-hidden="true" />
        <input
          type="text"
          name="_website"
          tabIndex={-1}
          autoComplete="off"
          style={{ position: "absolute", left: "-9999px" }}
          aria-hidden="true"
        />
        <label htmlFor="name">{t("contactForm.nameLabel")}</label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder={t("contactForm.namePlaceholder")}
          autoComplete="name"
          required
          maxLength={LIMITS.name}
          disabled={submitting}
        />
        <label htmlFor="email">{t("contactForm.emailLabel")}</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder={t("contactForm.emailPlaceholder")}
          autoComplete="email"
          required
          maxLength={LIMITS.email}
          disabled={submitting}
        />
        <label htmlFor="message">{t("contactForm.messageLabel")}</label>
        <textarea
          id="message"
          name="message"
          rows={5}
          placeholder={t("contactForm.messagePlaceholder")}
          required
          maxLength={LIMITS.message}
          defaultValue={prefillMessage}
          disabled={submitting}
        />
        <button type="submit" className="contact-form-btn" disabled={submitting}>
          {submitting ? t("contactForm.submitting") : t("contactForm.submit")}
        </button>
        <div
          id="formMessage"
          className="contact-form-msg"
          role="status"
          aria-live="polite"
          style={{ color: messageColor || undefined }}
        >
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
