"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { fetchAccountAddresses } from "@/lib/account/client";
import { useAccount } from "@/lib/account/context";
import {
  CHECKOUT_COUNTRIES,
  SHIPPING_METHODS,
  calculateOrderQuote,
  cartLinesToInput,
  emptyAddress,
  emptyCustomer,
  getCountry,
  validateCheckoutPayload,
  validateCustomer,
  validateAddress,
  type CheckoutPayload,
  type CheckoutStep,
} from "@/lib/checkout";
import { useCart } from "@/lib/cart";
import { listPaymentProviders } from "@/lib/payments";
import { saveConfirmedOrder, submitOrder, fetchOrderQuote } from "@/lib/orders";
import { ensureServerCartSynced } from "@/lib/store/cartSync";
import type { PaymentProviderId } from "@/lib/payments/types";
import { formatPrice } from "@/lib/products";
import CatalogOnlyNotice from "@/components/shop/CatalogOnlyNotice";
import { getFreeShippingThreshold } from "@/lib/checkout/shipping";
import { isCheckoutEnabled } from "@/lib/shop/mode";
import { useLocale } from "@/lib/i18n/context";
import { trackMarketingEvent } from "@/lib/marketing/events";
import { useMarket } from "@/lib/market/context";
import { shouldUseCustomerCheckoutApi } from "@/lib/customerCheckout/runtime";
import {
  fetchCustomerCheckoutQuote,
  fetchShippingMethods,
  saveCustomerCheckoutDraft,
} from "@/lib/customerCheckout/client";
import type { CustomerShippingMethod } from "@/lib/customerCheckout/types";
import { getAccountToken } from "@/lib/account/client";

const STEPS: CheckoutStep[] = [
  "customer",
  "shipping",
  "billing",
  "shipping_method",
  "payment",
  "review",
];

function stepIndex(step: CheckoutStep): number {
  return STEPS.indexOf(step);
}

export default function CheckoutForm() {
  const router = useRouter();
  const { t } = useLocale();
  const { countryCode, deliveryDays } = useMarket();
  const { user: accountUser, ready: accountReady } = useAccount();
  const { items, couponCode, clear, subtotal, shipping, discount, vatAmount, total } = useCart();
  const [step, setStep] = useState<CheckoutStep>("customer");
  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [shippingMethodId, setShippingMethodId] = useState("standard");
  const [paymentProvider, setPaymentProvider] = useState<PaymentProviderId>("paypal");
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);

  const [customer, setCustomer] = useState(emptyCustomer());
  const [shippingAddress, setShippingAddress] = useState(emptyAddress());
  const [billingAddress, setBillingAddress] = useState(emptyAddress());
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [serverQuote, setServerQuote] = useState<{
    subtotal: number;
    shipping: number;
    discount: number;
    vatAmount: number;
    total: number;
  } | null>(null);
  const [apiShippingMethods, setApiShippingMethods] = useState<CustomerShippingMethod[]>([]);
  const useCustomerCheckoutApi = shouldUseCustomerCheckoutApi();

  useEffect(() => {
    setShippingAddress((prev) => ({ ...prev, country: countryCode }));
    setBillingAddress((prev) => ({ ...prev, country: countryCode }));
  }, [countryCode]);

  useEffect(() => {
    if (items.length === 0) {
      setServerQuote(null);
      return;
    }

    let cancelled = false;

    async function loadQuote() {
      if (useCustomerCheckoutApi) {
        const cartSubtotal = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
        try {
          const quote = await fetchCustomerCheckoutQuote({
            subtotal: cartSubtotal,
            countryCode: shippingAddress.country || countryCode,
            shippingMethod: shippingMethodId,
            couponCode: couponCode || undefined,
          });
          if (cancelled) return;
          setServerQuote({
            subtotal: quote.subtotal,
            shipping: quote.shipping,
            discount: quote.discount,
            vatAmount: quote.vatAmount,
            total: quote.total,
          });
        } catch {
          if (!cancelled) setServerQuote(null);
        }
        return;
      }

      const response = await fetchOrderQuote({
        lines: items.map((item) => ({
          productId: item.productId,
          variantIds: item.variantIds,
          qty: item.qty,
        })),
        shippingMethodId,
        couponCode: couponCode || undefined,
        country: shippingAddress.country || "DE",
      });
      if (cancelled) return;
      if (response.success && response.quote) {
        setServerQuote({
          subtotal: response.quote.subtotal,
          shipping: response.quote.shipping,
          discount: response.quote.discount,
          vatAmount: response.quote.vatAmount,
          total: response.quote.total,
        });
      } else {
        setServerQuote(null);
      }
    }

    loadQuote();

    return () => {
      cancelled = true;
    };
  }, [items, shippingMethodId, couponCode, shippingAddress.country, countryCode, useCustomerCheckoutApi]);

  useEffect(() => {
    if (!useCustomerCheckoutApi) return;
    const country = shippingAddress.country || countryCode;
    let cancelled = false;
    fetchShippingMethods(country)
      .then((methods) => {
        if (cancelled) return;
        setApiShippingMethods(methods);
        if (methods.length > 0) {
          setShippingMethodId((current) =>
            methods.some((method) => method.code === current) ? current : methods[0].code
          );
        }
      })
      .catch(() => {
        if (!cancelled) setApiShippingMethods([]);
      });
    return () => {
      cancelled = true;
    };
  }, [useCustomerCheckoutApi, shippingAddress.country, countryCode]);

  useEffect(() => {
    if (!useCustomerCheckoutApi || !getAccountToken()) return;
    saveCustomerCheckoutDraft({
      country_code: shippingAddress.country || countryCode,
      shipping_method: shippingMethodId,
      coupon_code: couponCode || "",
    }).catch(() => {});
  }, [
    useCustomerCheckoutApi,
    step,
    shippingAddress.country,
    countryCode,
    shippingMethodId,
    couponCode,
  ]);

  useEffect(() => {
    if (!accountReady || !accountUser) return;

    setCustomer((prev) => ({
      ...prev,
      email: accountUser.email,
      firstName: accountUser.firstName,
      lastName: accountUser.lastName,
      phone: accountUser.phone || "",
      guest: false,
    }));

    fetchAccountAddresses()
      .then((addresses) => {
        const preferred =
          addresses.find((a) => a.isDefaultShipping) ||
          addresses.find((a) => a.isDefaultBilling) ||
          addresses[0];
        if (!preferred) return;

        const address = {
          firstName: preferred.firstName,
          lastName: preferred.lastName,
          street: preferred.street,
          zip: preferred.zip,
          city: preferred.city,
          country: preferred.country,
        };
        setShippingAddress(address);
        setBillingAddress(address);
      })
      .catch(() => {});
  }, [accountReady, accountUser]);

  const quote = useMemo(() => {
    if (items.length === 0) return null;
    return calculateOrderQuote(
      cartLinesToInput(
        items.map((item) => ({
          productId: item.productId,
          variantIds: item.variantIds,
          qty: item.qty,
        }))
      ),
      shippingMethodId,
      couponCode || undefined
    );
  }, [items, shippingMethodId, couponCode]);

  const paymentProviders = listPaymentProviders();
  const shippingOptions =
    useCustomerCheckoutApi && apiShippingMethods.length > 0
      ? apiShippingMethods.map((method) => ({
          id: method.code,
          labelKey: method.name,
          descriptionKey: "checkout.shippingStandardDesc",
          baseCost: method.price,
          freeFrom: method.free_from,
        }))
      : SHIPPING_METHODS.map((method) => ({
          id: method.id,
          labelKey: method.labelKey,
          descriptionKey: method.descriptionKey,
          baseCost: method.baseCost,
          freeFrom: getFreeShippingThreshold(countryCode),
        }));

  useEffect(() => {
    if (step === "review") {
      trackMarketingEvent("begin_checkout", { value: total, currency: "EUR" });
    }
    if (step === "payment") {
      trackMarketingEvent("add_payment_info", { payment_provider: paymentProvider });
    }
  }, [step, total, paymentProvider]);

  if (!isCheckoutEnabled()) {
    return <CatalogOnlyNotice />;
  }

  if (items.length === 0) {
    return (
      <div className="shop-empty">
        <h1>{t("checkout.emptyTitle")}</h1>
        <p>{t("checkout.emptyText")}</p>
        <Link href="/products/" className="shop-btn-primary">
          {t("cart.shopCta")}
        </Link>
      </div>
    );
  }

  function buildPayload(): CheckoutPayload {
    return {
      customer,
      shippingAddress,
      billingAddress: billingSameAsShipping ? shippingAddress : billingAddress,
      billingSameAsShipping,
      shippingMethodId,
      paymentProvider,
      couponCode: couponCode || undefined,
      acceptTerms,
      acceptPrivacy,
    };
  }

  function goNext() {
    setErrorKey(null);
    const payload = buildPayload();
    if (step === "customer") {
      const err = validateCustomer(payload.customer);
      if (err) return setErrorKey(err);
    }
    if (step === "shipping") {
      const err = validateAddress(payload.shippingAddress);
      if (err) return setErrorKey(err);
    }
    if (step === "billing" && !billingSameAsShipping) {
      const err = validateAddress(payload.billingAddress);
      if (err) return setErrorKey(err);
    }
    const idx = stepIndex(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  }

  function goBack() {
    setErrorKey(null);
    const idx = stepIndex(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  }

  async function handlePlaceOrder(e: FormEvent) {
    e.preventDefault();
    setErrorKey(null);
    const payload = buildPayload();
    const validationError = validateCheckoutPayload(payload);
    if (validationError) {
      setErrorKey(validationError);
      return;
    }

    setLoading(true);
    const cartSynced = await ensureServerCartSynced(items);
    if (!cartSynced) {
      setLoading(false);
      setErrorKey("checkout.cartSyncFailed");
      return;
    }

    const response = await submitOrder({
      ...payload,
      lines: items.map((item) => ({
        productId: item.productId,
        variantIds: item.variantIds,
        qty: item.qty,
      })),
    });

    setLoading(false);

    if (!response.success || !response.order) {
      setErrorKey(response.errorKey || "checkout.orderFailed");
      return;
    }

    saveConfirmedOrder(response.order);
    trackMarketingEvent("purchase", {
      transaction_id: response.order.orderNumber,
      value: response.order.total,
      currency: response.order.currency,
    });
    clear();
    router.push(`/checkout/erfolg/?order=${encodeURIComponent(response.order.orderNumber)}`);
  }

  const displaySubtotal = serverQuote?.subtotal ?? quote?.subtotal ?? subtotal;
  const displayShipping = serverQuote?.shipping ?? quote?.shipping ?? shipping;
  const displayDiscount = serverQuote?.discount ?? quote?.discount ?? discount;
  const displayVat = serverQuote?.vatAmount ?? quote?.vatAmount ?? vatAmount;
  const displayTotal = serverQuote?.total ?? quote?.total ?? total;

  return (
    <div className="checkout-page">
      <div className="checkout-head">
        <h1 className="shop-page-title">{t("checkout.title")}</h1>
        <Link href="/warenkorb/" className="checkout-back-link">
          ← {t("checkout.backToCart")}
        </Link>
      </div>

      <ol className="checkout-steps" aria-label={t("checkout.progress")}>
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`checkout-step${step === s ? " active" : ""}${stepIndex(step) > i ? " done" : ""}`}
          >
            <span>{i + 1}</span>
            {t(`checkout.step.${s}`)}
          </li>
        ))}
      </ol>

      <div className="checkout-layout">
        <div className="checkout-form-panel">
          {step === "customer" && (
            <section className="checkout-section">
              <h2>{t("checkout.step.customer")}</h2>
              <label>{t("checkout.email")} *</label>
              <input
                type="email"
                value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                autoComplete="email"
                required
              />
              <div className="checkout-row">
                <div>
                  <label>{t("checkout.firstName")} *</label>
                  <input
                    value={customer.firstName}
                    onChange={(e) => setCustomer({ ...customer, firstName: e.target.value })}
                    autoComplete="given-name"
                    required
                  />
                </div>
                <div>
                  <label>{t("checkout.lastName")} *</label>
                  <input
                    value={customer.lastName}
                    onChange={(e) => setCustomer({ ...customer, lastName: e.target.value })}
                    autoComplete="family-name"
                    required
                  />
                </div>
              </div>
              <label>{t("checkout.phone")}</label>
              <input
                type="tel"
                value={customer.phone || ""}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                autoComplete="tel"
              />
              <p className="checkout-hint">
                {accountReady && accountUser ? t("account.loggedInCheckout") : t("checkout.guestHint")}
              </p>
            </section>
          )}

          {step === "shipping" && (
            <section className="checkout-section">
              <h2>{t("checkout.step.shipping")}</h2>
              <AddressFields
                address={shippingAddress}
                onChange={setShippingAddress}
                t={t}
                prefix="shipping"
              />
            </section>
          )}

          {step === "billing" && (
            <section className="checkout-section">
              <h2>{t("checkout.step.billing")}</h2>
              <label className="checkout-checkbox">
                <input
                  type="checkbox"
                  checked={billingSameAsShipping}
                  onChange={(e) => setBillingSameAsShipping(e.target.checked)}
                />
                {t("checkout.billingSame")}
              </label>
              {!billingSameAsShipping && (
                <AddressFields
                  address={billingAddress}
                  onChange={setBillingAddress}
                  t={t}
                  prefix="billing"
                />
              )}
            </section>
          )}

          {step === "shipping_method" && (
            <section className="checkout-section">
              <h2>{t("checkout.step.shipping_method")}</h2>
              <p className="checkout-delivery-estimate">
                {t("checkout.deliveryEstimate").replace("{estimate}", deliveryDays)}
              </p>
              <div className="checkout-option-list">
                {shippingOptions.map((method) => (
                  <label key={method.id} className="checkout-option">
                    <input
                      type="radio"
                      name="shippingMethod"
                      value={method.id}
                      checked={shippingMethodId === method.id}
                      onChange={() => setShippingMethodId(method.id)}
                    />
                    <span>
                      <strong>
                        {useCustomerCheckoutApi && apiShippingMethods.length > 0
                          ? method.labelKey
                          : t(method.labelKey)}
                      </strong>
                      <small>
                        {useCustomerCheckoutApi && apiShippingMethods.length > 0
                          ? `${formatPrice(method.baseCost)} · ${deliveryDays}`
                          : `${t(method.descriptionKey)} · ${deliveryDays}`}
                      </small>
                    </span>
                    <em>
                      {displaySubtotal - displayDiscount >= method.freeFrom
                        ? t("cart.shippingFree")
                        : formatPrice(method.baseCost)}
                    </em>
                  </label>
                ))}
              </div>
            </section>
          )}

          {step === "payment" && (
            <section className="checkout-section">
              <h2>{t("checkout.step.payment")}</h2>
              <div className="checkout-option-list">
                {paymentProviders.map((provider) => (
                  <label key={provider.id} className="checkout-option">
                    <input
                      type="radio"
                      name="paymentProvider"
                      value={provider.id}
                      checked={paymentProvider === provider.id}
                      onChange={() => setPaymentProvider(provider.id)}
                    />
                    <span>
                      <strong>{t(provider.labelKey)}</strong>
                      <small>{t(provider.descriptionKey)}</small>
                    </span>
                  </label>
                ))}
              </div>
              <p className="checkout-trust">{t("checkout.paymentSecure")}</p>
            </section>
          )}

          {step === "review" && (
            <form className="checkout-section" onSubmit={handlePlaceOrder}>
              <h2>{t("checkout.step.review")}</h2>
              <div className="checkout-review-block">
                <h3>{t("checkout.reviewCustomer")}</h3>
                <p>
                  {customer.firstName} {customer.lastName}
                  <br />
                  {customer.email}
                </p>
              </div>
              <div className="checkout-review-block">
                <h3>{t("checkout.reviewShipping")}</h3>
                <p>
                  {shippingAddress.street}
                  <br />
                  {shippingAddress.zip} {shippingAddress.city}
                  <br />
                  {getCountry(shippingAddress.country)?.name ?? shippingAddress.country}
                </p>
              </div>
              <label className="checkout-checkbox">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  required
                />
                {t("checkout.acceptTerms")}{" "}
                <Link href="/impressum/" target="_blank">
                  {t("checkout.termsLink")}
                </Link>
              </label>
              <label className="checkout-checkbox">
                <input
                  type="checkbox"
                  checked={acceptPrivacy}
                  onChange={(e) => setAcceptPrivacy(e.target.checked)}
                  required
                />
                {t("checkout.acceptPrivacy")}{" "}
                <Link href="/datenschutz/" target="_blank">
                  {t("checkout.privacyLink")}
                </Link>
              </label>
              {errorKey && <p className="shop-modal-error">{t(errorKey)}</p>}
              <button type="submit" className="shop-btn-primary" disabled={loading}>
                {loading ? t("checkout.placing") : `${t("checkout.placeOrder")} – ${formatPrice(displayTotal)}`}
              </button>
            </form>
          )}

          {step !== "review" && (
            <>
              {errorKey && <p className="shop-modal-error">{t(errorKey)}</p>}
              <div className="checkout-nav">
                {stepIndex(step) > 0 && (
                  <button type="button" className="shop-btn-secondary" onClick={goBack}>
                    {t("checkout.back")}
                  </button>
                )}
                <button type="button" className="shop-btn-primary" onClick={goNext}>
                  {t("checkout.next")}
                </button>
              </div>
            </>
          )}
        </div>

        <aside className="cart-summary checkout-summary">
          <h2>{t("checkout.orderSummary")}</h2>
          <ul className="checkout-items">
            {items.map((item) => (
              <li key={item.lineId}>
                <span>
                  {item.qty}× {item.name}
                  {item.variantLabel ? ` (${item.variantLabel})` : ""}
                </span>
                <span>{formatPrice(item.unitPrice * item.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="cart-summary-row">
            <span>{t("cart.subtotal")}</span>
            <span>{formatPrice(displaySubtotal)}</span>
          </div>
          {displayDiscount > 0 && (
            <div className="cart-summary-row">
              <span>{t("cart.discount")}</span>
              <span>−{formatPrice(displayDiscount)}</span>
            </div>
          )}
          <div className="cart-summary-row">
            <span>{t("cart.shipping")}</span>
            <span>{displayShipping === 0 ? t("cart.shippingFree") : formatPrice(displayShipping)}</span>
          </div>
          <div className="cart-summary-row">
            <span>{t("cart.vat")}</span>
            <span>{formatPrice(displayVat)}</span>
          </div>
          <div className="cart-summary-row cart-summary-total">
            <span>{t("cart.total")}</span>
            <span>{formatPrice(displayTotal)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function AddressFields({
  address,
  onChange,
  t,
  prefix,
}: {
  address: ReturnType<typeof emptyAddress>;
  onChange: (next: typeof address) => void;
  t: (key: string) => string;
  prefix: string;
}) {
  return (
    <>
      <div className="checkout-row">
        <div>
          <label htmlFor={`${prefix}-firstName`}>{t("checkout.firstName")} *</label>
          <input
            id={`${prefix}-firstName`}
            value={address.firstName}
            onChange={(e) => onChange({ ...address, firstName: e.target.value })}
            autoComplete="given-name"
            required
          />
        </div>
        <div>
          <label htmlFor={`${prefix}-lastName`}>{t("checkout.lastName")} *</label>
          <input
            id={`${prefix}-lastName`}
            value={address.lastName}
            onChange={(e) => onChange({ ...address, lastName: e.target.value })}
            autoComplete="family-name"
            required
          />
        </div>
      </div>
      <label htmlFor={`${prefix}-street`}>{t("checkout.street")} *</label>
      <input
        id={`${prefix}-street`}
        value={address.street}
        onChange={(e) => onChange({ ...address, street: e.target.value })}
        autoComplete="street-address"
        required
      />
      <div className="checkout-row">
        <div>
          <label htmlFor={`${prefix}-zip`}>{t("checkout.zip")} *</label>
          <input
            id={`${prefix}-zip`}
            value={address.zip}
            onChange={(e) => onChange({ ...address, zip: e.target.value })}
            autoComplete="postal-code"
            required
          />
        </div>
        <div>
          <label htmlFor={`${prefix}-city`}>{t("checkout.city")} *</label>
          <input
            id={`${prefix}-city`}
            value={address.city}
            onChange={(e) => onChange({ ...address, city: e.target.value })}
            autoComplete="address-level2"
            required
          />
        </div>
      </div>
      <label htmlFor={`${prefix}-country`}>{t("checkout.country")} *</label>
      <select
        id={`${prefix}-country`}
        value={address.country}
        onChange={(e) => onChange({ ...address, country: e.target.value })}
        autoComplete="country"
        required
      >
        {CHECKOUT_COUNTRIES.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name}
          </option>
        ))}
      </select>
    </>
  );
}
