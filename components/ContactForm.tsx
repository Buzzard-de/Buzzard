"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  LIMITS,
  canSubmitForm,
  clampText,
  isValidEmail,
  markFormSubmitted,
} from "@/lib/security";

const RATE_LIMIT_KEY = "buzzard_contact_last";
const MIN_SUBMIT_MS = 3000;

export default function ContactForm() {
  const [message, setMessage] = useState("");
  const [messageColor, setMessageColor] = useState("");
  const [sending, setSending] = useState(false);
  const [formStartedAt, setFormStartedAt] = useState(0);

  useEffect(() => {
    setFormStartedAt(Date.now());
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    const form = e.currentTarget;
    const honey = (form.elements.namedItem("_honey") as HTMLInputElement)?.value;
    const website = (form.elements.namedItem("_website") as HTMLInputElement)?.value;
    if (honey || website) return;

    if (Date.now() - formStartedAt < MIN_SUBMIT_MS) {
      setMessage("Bitte Formular kurz ausfüllen und erneut senden.");
      return;
    }

    if (!canSubmitForm(RATE_LIMIT_KEY)) {
      setMessage("Bitte warten Sie eine Minute, bevor Sie erneut senden.");
      return;
    }

    const name = clampText((form.elements.namedItem("name") as HTMLInputElement).value, LIMITS.name);
    const email = clampText((form.elements.namedItem("email") as HTMLInputElement).value, LIMITS.email);
    const msg = clampText((form.elements.namedItem("message") as HTMLTextAreaElement).value, LIMITS.message);

    if (!name || !email || !msg) {
      setMessage("Bitte alle Felder ausfüllen.");
      return;
    }

    if (!isValidEmail(email)) {
      setMessage("Bitte geben Sie eine gültige E-Mail-Adresse ein.");
      return;
    }

    setSending(true);

    try {
      const res = await fetch("https://formsubmit.co/ajax/info@buzzard.com", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          message: msg,
          _subject: "Buzzard Kontaktanfrage",
          _template: "table",
        }),
      });

      if (res.ok) {
        markFormSubmitted(RATE_LIMIT_KEY);
        setMessageColor("#c9a840");
        setMessage("Vielen Dank — Ihre Nachricht wurde gesendet.");
        form.reset();
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage((data as { message?: string }).message || "Beim Senden ist ein Fehler aufgetreten.");
      }
    } catch {
      setMessageColor("#888");
      setMessage("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form id="contactForm" onSubmit={handleSubmit} noValidate>
      <input type="text" name="_honey" tabIndex={-1} autoComplete="off" style={{ display: "none" }} aria-hidden="true" />
      <input type="text" name="_website" tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: "-9999px" }} aria-hidden="true" />
      <input type="hidden" name="_formStarted" value={String(formStartedAt)} />
      <label htmlFor="name">Ihr Name</label>
      <input id="name" name="name" type="text" placeholder="Max Mustermann" autoComplete="name" required maxLength={LIMITS.name} />
      <label htmlFor="email">E-Mail-Adresse</label>
      <input id="email" name="email" type="email" placeholder="max@beispiel.de" autoComplete="email" required maxLength={LIMITS.email} />
      <label htmlFor="message">Ihre Nachricht / Anfrage</label>
      <textarea id="message" name="message" rows={5} placeholder="Teilenummer, Fahrzeug, Frage..." required maxLength={LIMITS.message} />
      <button type="submit" className="contact-form-btn" disabled={sending}>
        {sending ? "Sende…" : "Nachricht senden"}
      </button>
      <div id="formMessage" className="contact-form-msg" role="status" aria-live="polite" style={{ color: messageColor || undefined }}>
        {message}
      </div>
    </form>
  );
}
