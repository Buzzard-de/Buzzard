"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  deleteAccountAddress,
  fetchAccountAddresses,
  saveAccountAddress,
} from "@/lib/account/client";
import type { AccountAddress } from "@/lib/account/types";
import { useLocale } from "@/lib/i18n/context";
import { CHECKOUT_COUNTRIES } from "@/lib/checkout/countries";

const empty = (): Partial<AccountAddress> => ({
  firstName: "",
  lastName: "",
  street: "",
  zip: "",
  city: "",
  country: "DE",
});

export default function AccountAddressBook() {
  const { t } = useLocale();
  const [addresses, setAddresses] = useState<AccountAddress[]>([]);
  const [form, setForm] = useState<Partial<AccountAddress>>(empty());
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    setAddresses(await fetchAccountAddresses());
  }

  useEffect(() => {
    load().catch(() => setAddresses([]));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await saveAccountAddress({ ...form, id: editingId || undefined });
    setForm(empty());
    setEditingId(null);
    load();
  }

  return (
    <div className="account-page">
      <h1>{t("account.addressesTitle")}</h1>
      <ul className="account-address-list">
        {addresses.map((address) => (
          <li key={address.id} className="account-panel">
            <p>{address.firstName} {address.lastName}<br />{address.street}<br />{address.zip} {address.city}</p>
            <div className="account-inline-actions">
              <button type="button" className="shop-btn-secondary" onClick={() => { setForm(address); setEditingId(address.id); }}>{t("account.edit")}</button>
              <button type="button" className="cart-remove" onClick={() => deleteAccountAddress(address.id).then(load)}>{t("account.delete")}</button>
            </div>
          </li>
        ))}
      </ul>
      <form className="account-panel account-form" onSubmit={handleSubmit}>
        <h2>{editingId ? t("account.editAddress") : t("account.addAddress")}</h2>
        <div className="checkout-row">
          <label>{t("checkout.firstName")}<input value={form.firstName || ""} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></label>
          <label>{t("checkout.lastName")}<input value={form.lastName || ""} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></label>
        </div>
        <label>{t("checkout.street")}<input value={form.street || ""} onChange={(e) => setForm({ ...form, street: e.target.value })} required /></label>
        <div className="checkout-row">
          <label>{t("checkout.zip")}<input value={form.zip || ""} onChange={(e) => setForm({ ...form, zip: e.target.value })} required /></label>
          <label>{t("checkout.city")}<input value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} required /></label>
        </div>
        <label>{t("checkout.country")}
          <select value={form.country || "DE"} onChange={(e) => setForm({ ...form, country: e.target.value })}>
            {CHECKOUT_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{t(c.labelKey)}</option>)}
          </select>
        </label>
        <label className="checkout-checkbox"><input type="checkbox" checked={!!form.isDefaultShipping} onChange={(e) => setForm({ ...form, isDefaultShipping: e.target.checked })} /> {t("account.defaultShipping")}</label>
        <button type="submit" className="shop-btn-primary">{t("account.save")}</button>
      </form>
    </div>
  );
}
