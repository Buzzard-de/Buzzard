import { COMPANY_LEGAL_NAME, getCompanyAddressSingleLine } from "@/lib/site/company";
import { CONTACT_EMAIL } from "@/lib/site/contact";

/** Standard Muster-Widerrufsformular (Vor Verkaufsstart — rechtliche Prüfung empfohlen). */
export default function WiderrufFormTemplate() {
  const address = getCompanyAddressSingleLine();

  return (
    <section id="widerrufsformular" className="legal-withdrawal-form">
      <h2>Muster-Widerrufsformular</h2>
      <p>
        Wenn Sie den Vertrag widerrufen wollen, füllen Sie bitte dieses Formular aus und senden Sie es zurück an:
      </p>
      <address className="legal-withdrawal-address">
        <strong>{COMPANY_LEGAL_NAME}</strong>
        <br />
        {address}
        <br />
        E-Mail: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </address>
      <div className="legal-withdrawal-template" aria-label="Muster-Widerrufsformular">
        <p>— An {COMPANY_LEGAL_NAME}, {address}, E-Mail: {CONTACT_EMAIL}:</p>
        <p>— Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*)/die Erbringung der folgenden Dienstleistung (*)</p>
        <p>— Bestellt am (*)/erhalten am (*)</p>
        <p>— Name des/der Verbraucher(s)</p>
        <p>— Anschrift des/der Verbraucher(s)</p>
        <p>— Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)</p>
        <p>— Datum</p>
        <p>
          <small>(*) Unzutreffendes streichen.</small>
        </p>
      </div>
      <p>
        Sie können das ausgefüllte Formular per E-Mail oder Post senden. Bis zum Verkaufsstart können Sie uns
        vorab über das <a href="/hilfe/#kontakt">Kontaktformular</a> erreichen.
      </p>
    </section>
  );
}
