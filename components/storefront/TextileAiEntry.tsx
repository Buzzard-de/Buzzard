"use client";

import { useMemo, useState } from "react";

/**
 * Textile AI hub. Optional fields. Demo try-on is not a live body guarantee.
 */
export default function TextileAiEntry() {
  const [consentPhoto, setConsentPhoto] = useState(false);
  const [consentMeasures, setConsentMeasures] = useState(false);
  const [audience, setAudience] = useState("");
  const [occasion, setOccasion] = useState("");
  const [profession, setProfession] = useState("");
  const [style, setStyle] = useState("");
  const [asked, setAsked] = useState(false);

  const recommendation = useMemo(() => {
    if (!asked) return null;
    let line = "daily";
    const reasons = ["Keine Pflichtfelder — Alltagsvorschlag möglich"];
    if (occasion === "work" || profession) {
      line = "workwear";
      reasons[0] = "Beruf/Anlass Arbeit → Berufskleidung";
    } else if (occasion === "formal") {
      line = "formal";
      reasons[0] = "Festlicher Anlass → formelle Linie";
    } else if (occasion === "sport") {
      line = "sport";
      reasons[0] = "Sportanlass";
    }
    if (audience === "children" || audience === "youth") {
      reasons.push("Jugend/Kinder — kein Erwachsenen-Schnitt");
    }
    if (style) reasons.push(`Stilhinweis: ${style}`);
    return { line, reasons };
  }, [asked, audience, occasion, profession, style]);

  return (
    <section className="textile-ai-entry" aria-labelledby="textile-ai-heading">
      <h2 id="textile-ai-heading">Textile AI</h2>
      <p>
        Optionaler Stilassistent für Damen, Herren, Kinder, Jugend, Erwachsene und Senioren.
        Kein Feld ist Pflicht. Fotos und Maße nur mit ausdrücklicher Einwilligung.
      </p>
      <figure>
        <div
          role="img"
          aria-label="Video-Platzhalter. Kein urheberrechtlich geschütztes Drittvideo eingebettet."
          className="textile-ai-video-slot"
        />
        <figcaption>Erklärvideo: Platzhalter — Lizenz noch nicht freigegeben.</figcaption>
      </figure>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setAsked(true);
        }}
      >
        <label>
          Zielgruppe
          <select name="audience" value={audience} onChange={(event) => setAudience(event.target.value)}>
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
          <select name="occasion" value={occasion} onChange={(event) => setOccasion(event.target.value)}>
            <option value="">Keine Angabe</option>
            <option value="daily">Alltag</option>
            <option value="work">Beruf</option>
            <option value="formal">Festlich</option>
            <option value="sport">Sport</option>
            <option value="event">Besonderer Anlass</option>
          </select>
        </label>
        <label>
          Beruf (optional)
          <input name="profession" value={profession} onChange={(event) => setProfession(event.target.value)} />
        </label>
        <label>
          Stil (optional)
          <input name="style" value={style} onChange={(event) => setStyle(event.target.value)} />
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
        {consentMeasures ? (
          <fieldset>
            <legend>Maße (optional)</legend>
            <label>
              Größe
              <input name="height" inputMode="numeric" />
            </label>
            <label>
              Gewicht
              <input name="weight" inputMode="numeric" />
            </label>
          </fieldset>
        ) : null}
        {consentPhoto ? (
          <label>
            Foto (optional, nicht für Modelltraining)
            <input type="file" name="photo" accept="image/*" />
          </label>
        ) : null}
        <p className="textile-ai-demo-note">Try-on: DEMO — keine Passformgarantie — LIVE_VERIFIED nicht gesetzt.</p>
        <button type="submit">Empfehlung anfragen</button>
      </form>
      {recommendation ? (
        <aside aria-live="polite">
          <p>Vorschlag: {recommendation.line}</p>
          <ul>
            {recommendation.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </aside>
      ) : null}
    </section>
  );
}
