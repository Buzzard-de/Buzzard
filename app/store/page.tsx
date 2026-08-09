import StoreShop from "@/components/store/StoreShop";
import { isSqliteStoreEnabled } from "@/lib/api/config";
import Link from "next/link";

export const metadata = {
  title: "Buzzard Store – SQLite REST Shop",
  description: "Live-Produkte aus der Buzzard SQLite-Datenbank mit JWT-Konto und serverseitigem Warenkorb.",
};

export default function StorePage() {
  if (!isSqliteStoreEnabled()) {
    return (
      <section className="error-page">
        <h1>Store nicht aktiv</h1>
        <p>
          Setzen Sie <code>NEXT_PUBLIC_SQLITE_STORE=1</code> und{" "}
          <code>NEXT_PUBLIC_BUZZARD_API_URL</code>, um den Full-Stack SQLite-Shop zu aktivieren.
        </p>
        <Link href="/" className="btn-primary">
          Zur Startseite
        </Link>
      </section>
    );
  }

  return <StoreShop />;
}
