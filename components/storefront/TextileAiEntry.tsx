"use client";

import { useState } from "react";

/**
 * Textile AI intake. Optional fields only. Demo try-on is not a live body guarantee.
 */
export default function TextileAiEntry() {
  const [consentPhoto, setConsentPhoto] = useState(false);
  const [consentMeasures, setConsentMeasures] = useState(false);

  return (
    <section className="textile-ai-entry" aria-labelledby="textile-ai-heading">
      <h2 id="textile-ai-heading">Textile AI</h2>
      <p>
        Optional: Geschlecht, Altersgruppe, Anlass, Farbe, Stil, Beruf, Maße oder Foto.
        Kein Feld ist Pflicht. Virtuelle Anprobe ist eine Demo und keine Passformgarantie.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <label>
          Zielgruppe
          <select name="audience" defaultValue="">
            <option value="">Keine Angabe</option>
            <option value="women">Frauen</option>
            <option value="men">Männer</option>
            <option value="children">Kinder</option>
            <option value="youth">Jugend</option>
            <option value="adults">Erwachsene</option>
            <option value="seniors">Ältere</option>
          </select>
        </label>
        <label>
          Anlass
          <select name="occasion" defaultValue="">
            <option value="">Keine Angabe</option>
            <option value="daily">Alltag</option>
            <option value="work">Beruf</option>
            <option value="formal">Festlich</option>
            <option value="sport">Sport</option>
            <option value="event">Besonderer Anlass</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={consentMeasures}
            onChange={(event) => setConsentMeasures(event.target.checked)}
          />
          Ich stimme der zweckgebundenen Speicherung optionaler Maße zu
        </label>
        <label>
          <input
            type="checkbox"
            checked={consentPhoto}
            onChange={(event) => setConsentPhoto(event.target.checked)}
          />
          Ich stimme der zweckgebundenen Nutzung eines optionalen Fotos zu
        </label>
        <p className="textile-ai-demo-note">Try-on: DEMO — LIVE_VERIFIED nicht gesetzt.</p>
        <button type="submit">Empfehlung anfragen</button>
      </form>
    </section>
  );
}
