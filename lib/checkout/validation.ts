import { getCountry } from "./countries";
import type { CheckoutAddress, CheckoutCustomer, CheckoutPayload } from "./types";
import {
  clampText,
  isSafeName,
  isValidEmail,
  LIMITS,
} from "@/lib/security";

export function validateCustomer(customer: CheckoutCustomer): string | null {
  const email = clampText(customer.email, LIMITS.email).toLowerCase();
  const firstName = clampText(customer.firstName, LIMITS.name);
  const lastName = clampText(customer.lastName, LIMITS.name);

  if (!email || !firstName || !lastName) return "checkout.errorRequired";
  if (!isValidEmail(email)) return "checkout.errorEmail";
  if (!isSafeName(firstName) || !isSafeName(lastName)) return "checkout.errorName";
  return null;
}

export function validateAddress(address: CheckoutAddress): string | null {
  const firstName = clampText(address.firstName, LIMITS.name);
  const lastName = clampText(address.lastName, LIMITS.name);
  const street = clampText(address.street, LIMITS.street);
  const zip = clampText(address.zip, LIMITS.zip);
  const city = clampText(address.city, LIMITS.city);
  const country = clampText(address.country, 2).toUpperCase();

  if (!firstName || !lastName || !street || !zip || !city || !country) {
    return "checkout.errorRequired";
  }

  if (!isSafeName(firstName) || !isSafeName(lastName)) return "checkout.errorName";

  const countryDef = getCountry(country);
  if (!countryDef) return "checkout.errorCountry";
  if (!countryDef.zipPattern.test(zip)) return "checkout.errorZip";

  return null;
}

export function validateCheckoutPayload(payload: CheckoutPayload): string | null {
  const customerError = validateCustomer(payload.customer);
  if (customerError) return customerError;

  const shippingError = validateAddress(payload.shippingAddress);
  if (shippingError) return shippingError;

  if (!payload.billingSameAsShipping) {
    const billingError = validateAddress(payload.billingAddress);
    if (billingError) return billingError;
  }

  if (!payload.shippingMethodId) return "checkout.errorShippingMethod";
  if (!payload.paymentProvider) return "checkout.errorPayment";
  if (!payload.acceptTerms || !payload.acceptPrivacy) return "checkout.errorLegal";

  return null;
}

export function emptyAddress(country = "DE"): CheckoutAddress {
  return {
    firstName: "",
    lastName: "",
    street: "",
    zip: "",
    city: "",
    country,
  };
}

export function emptyCustomer(): CheckoutCustomer {
  return {
    email: "",
    firstName: "",
    lastName: "",
    guest: true,
  };
}
