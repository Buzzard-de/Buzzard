"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAccount } from "@/lib/account/context";
import { useMarket } from "@/lib/market/context";
import {
  storeAddToCart,
  storeCategories,
  storeCreateOrder,
  storeFetchCart,
  storeProducts,
  type StoreCart,
  type StoreCategory,
  type StoreOrderResult,
  type StoreProduct,
} from "@/lib/store";
import { formatPrice } from "@/lib/products";
import "./store.css";

type View = "shop" | "cart" | "success";

export default function StoreShop() {
  const { user, login, register, logout } = useAccount();
  const { countryCode, currency } = useMarket();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<StoreCart>({ items: [], subtotal: 0, weight: 0 });
  const [view, setView] = useState<View>("shop");
  const [order, setOrder] = useState<StoreOrderResult | null>(null);
  const [auth, setAuth] = useState({ email: "", password: "", name: "" });
  const [authMode, setAuthMode] = useState<"login" | "register" | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    const list = await storeProducts({ q: query || undefined, category: category || undefined });
    setProducts(list);
    setCategories(await storeCategories());
    if (user) {
      try {
        setCart(await storeFetchCart());
      } catch {
        setCart({ items: [], subtotal: 0, weight: 0 });
      }
    }
  }, [query, category, user]);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  async function handleAdd(productId: number) {
    if (!user) {
      setAuthMode("login");
      return;
    }
    setLoading(true);
    try {
      await storeAddToCart({ productId, quantity: 1 });
      await reload();
      setView("cart");
    } catch (err) {
      setError(err instanceof Error ? err.message : "store.addFailed");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckout() {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const result = await storeCreateOrder({ countryCode, currency });
      setOrder(result);
      setView("success");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "store.checkoutFailed");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    setError("");
    try {
      await login(auth.email, auth.password);
      setAuthMode(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "account.login.failed");
    }
  }

  async function handleRegister() {
    setError("");
    try {
      await register({
        email: auth.email,
        password: auth.password,
        firstName: auth.name.split(" ")[0] || auth.name,
        lastName: auth.name.split(" ").slice(1).join(" ") || auth.name,
        country: countryCode,
        acceptTerms: true,
      });
      setAuthMode(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "account.register.failed");
    }
  }

  return (
    <div className="store-page">
      <div className="store-toolbar">
        <button type="button" className="store-logo" onClick={() => setView("shop")}>
          BUZZARD STORE
        </button>
        <input
          className="store-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Produkte suchen…"
        />
        <button type="button" onClick={() => (user ? setAuthMode(null) : setAuthMode("login"))}>
          {user ? user.email : "Anmelden"}
        </button>
        <button type="button" onClick={() => setView("cart")}>
          Warenkorb ({cart.items.length})
        </button>
        {user && (
          <button type="button" onClick={() => logout().then(() => reload())}>
            Abmelden
          </button>
        )}
        <Link href="/admin/" className="store-admin-link">
          Admin
        </Link>
      </div>

      <nav className="store-nav">
        <button type="button" className={!category ? "active" : ""} onClick={() => setCategory("")}>
          Alle
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={category === cat.name ? "active" : ""}
            onClick={() => setCategory(cat.name)}
          >
            {cat.name}
          </button>
        ))}
      </nav>

      {authMode && (
        <section className="store-panel store-auth">
          <h2>{authMode === "login" ? "Anmelden" : "Konto erstellen"}</h2>
          {authMode === "register" && (
            <input
              placeholder="Name"
              value={auth.name}
              onChange={(e) => setAuth({ ...auth, name: e.target.value })}
            />
          )}
          <input
            placeholder="E-Mail"
            value={auth.email}
            onChange={(e) => setAuth({ ...auth, email: e.target.value })}
          />
          <input
            type="password"
            placeholder="Passwort"
            value={auth.password}
            onChange={(e) => setAuth({ ...auth, password: e.target.value })}
          />
          <div className="store-auth-actions">
            {authMode === "login" ? (
              <button type="button" className="store-gold" onClick={handleLogin}>
                Anmelden
              </button>
            ) : (
              <button type="button" className="store-gold" onClick={handleRegister}>
                Registrieren
              </button>
            )}
            <button type="button" onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>
              {authMode === "login" ? "Konto erstellen" : "Bereits registriert?"}
            </button>
            <button type="button" onClick={() => setAuthMode(null)}>
              Schließen
            </button>
          </div>
          {error && <p className="store-error">{error}</p>}
        </section>
      )}

      {view === "shop" && (
        <main>
          <section className="store-hero">
            <span>EUROPE + BALKANS</span>
            <h1>BUZZARD</h1>
            <p>Live-Produkte aus der SQLite-Datenbank — JWT-Konto, serverseitiger Warenkorb, REST-Checkout.</p>
          </section>
          <section className="store-grid">
            {products.map((product) => (
              <article key={product.id} className="store-card">
                <div className="store-emoji">📦</div>
                <small>{product.category}</small>
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <div className="store-buy">
                  <strong>{formatPrice(product.price_eur)}</strong>
                  <button type="button" disabled={loading} onClick={() => handleAdd(product.id)}>
                    In den Warenkorb
                  </button>
                </div>
              </article>
            ))}
          </section>
        </main>
      )}

      {view === "cart" && (
        <main className="store-panel">
          <h1>Warenkorb</h1>
          {!user && <p>Bitte <button type="button" onClick={() => setAuthMode("login")}>anmelden</button>, um zu bestellen.</p>}
          {cart.items.map((item) => (
            <div key={item.product_id} className="store-row">
              <span>
                {item.name} × {item.quantity}
              </span>
              <strong>{formatPrice(item.price_eur * item.quantity)}</strong>
            </div>
          ))}
          <h2>{formatPrice(cart.subtotal)}</h2>
          <p>
            Versandland: {countryCode} · {currency}
          </p>
          {error && <p className="store-error">{error}</p>}
          <button
            type="button"
            className="store-gold"
            disabled={!cart.items.length || !user || loading}
            onClick={handleCheckout}
          >
            Bestellung aufgeben
          </button>
          <p className="store-note">
            Oder <Link href="/konto/bestellungen/">Bestellungen im Konto</Link> ansehen.
          </p>
        </main>
      )}

      {view === "success" && order && (
        <main className="store-panel store-success">
          <h1>✓ Bestellung erstellt</h1>
          <p>
            Bestellnummer: <strong>{order.orderNumber}</strong>
          </p>
          <p>Gesamt: {formatPrice(order.total)}</p>
          <button type="button" className="store-gold" onClick={() => setView("shop")}>
            Weiter einkaufen
          </button>
        </main>
      )}
    </div>
  );
}
