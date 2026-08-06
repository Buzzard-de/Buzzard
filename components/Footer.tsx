import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Image src="/logo/logo.png" alt="Buzzard" width={40} height={40} />
          <span>BUZZARD</span>
        </div>
        <div className="footer-links">
          <Link href="/impressum/">Impressum</Link>
          <Link href="/datenschutz/">Datenschutz</Link>
          <Link href="/impressum/">Kontakt</Link>
          <a href="mailto:info@buzzard.com">info@buzzard.com</a>
        </div>
        <p className="footer-copy">© 2026 Buzzard. Alle Rechte vorbehalten.</p>
      </div>
    </footer>
  );
}
