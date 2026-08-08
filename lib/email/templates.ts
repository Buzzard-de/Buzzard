import type { BuzzardLocale } from "@/lib/i18n/types";

export const EMAIL_TEMPLATE_KEYS = [
  "account_verification",
  "password_reset",
  "order_confirmation",
  "payment_confirmation",
  "shipping_notification",
  "delivery_notification",
  "refund_notification",
] as const;

export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[number];

type EmailTemplate = {
  subject: string;
  body: string;
};

const templates: Record<BuzzardLocale, Record<EmailTemplateKey, EmailTemplate>> = {
  de: {
    account_verification: { subject: "Bitte bestätigen Sie Ihr Buzzard-Konto", body: "Hallo {firstName},\n\nbitte bestätigen Sie Ihre E-Mail-Adresse." },
    password_reset: { subject: "Passwort zurücksetzen", body: "Hallo {firstName},\n\nsetzen Sie Ihr Passwort über den Link zurück." },
    order_confirmation: { subject: "Bestellbestätigung {orderNumber}", body: "Vielen Dank für Ihre Bestellung {orderNumber}." },
    payment_confirmation: { subject: "Zahlung erhalten – {orderNumber}", body: "Wir haben Ihre Zahlung für Bestellung {orderNumber} erhalten." },
    shipping_notification: { subject: "Ihre Bestellung {orderNumber} wurde versendet", body: "Sendungsverfolgung: {trackingNumber}" },
    delivery_notification: { subject: "Bestellung {orderNumber} zugestellt", body: "Ihre Bestellung wurde zugestellt." },
    refund_notification: { subject: "Erstattung für {orderNumber}", body: "Eine Erstattung wurde veranlasst." },
  },
  en: {
    account_verification: { subject: "Please verify your Buzzard account", body: "Hello {firstName},\n\nplease verify your email address." },
    password_reset: { subject: "Reset your password", body: "Hello {firstName},\n\nreset your password using the link." },
    order_confirmation: { subject: "Order confirmation {orderNumber}", body: "Thank you for your order {orderNumber}." },
    payment_confirmation: { subject: "Payment received – {orderNumber}", body: "We received your payment for order {orderNumber}." },
    shipping_notification: { subject: "Your order {orderNumber} has shipped", body: "Tracking: {trackingNumber}" },
    delivery_notification: { subject: "Order {orderNumber} delivered", body: "Your order has been delivered." },
    refund_notification: { subject: "Refund for {orderNumber}", body: "A refund has been initiated." },
  },
  tr: {
    account_verification: { subject: "Buzzard hesabınızı doğrulayın", body: "Merhaba {firstName},\n\nlütfen e-posta adresinizi doğrulayın." },
    password_reset: { subject: "Şifrenizi sıfırlayın", body: "Merhaba {firstName},\n\nbağlantıyı kullanarak şifrenizi sıfırlayın." },
    order_confirmation: { subject: "Sipariş onayı {orderNumber}", body: "{orderNumber} numaralı siparişiniz için teşekkürler." },
    payment_confirmation: { subject: "Ödeme alındı – {orderNumber}", body: "{orderNumber} siparişiniz için ödemeniz alındı." },
    shipping_notification: { subject: "Siparişiniz kargolandı {orderNumber}", body: "Takip: {trackingNumber}" },
    delivery_notification: { subject: "Sipariş teslim edildi {orderNumber}", body: "Siparişiniz teslim edildi." },
    refund_notification: { subject: "{orderNumber} için iade", body: "İade işlemi başlatıldı." },
  },
  ar: {
    account_verification: { subject: "يرجى تأكيد حساب Buzzard", body: "مرحبًا {firstName},\n\nيرجى تأكيد بريدك الإلكتروني." },
    password_reset: { subject: "إعادة تعيين كلمة المرور", body: "مرحبًا {firstName},\n\nأعد تعيين كلمة المرور عبر الرابط." },
    order_confirmation: { subject: "تأكيد الطلب {orderNumber}", body: "شكرًا لطلبك {orderNumber}." },
    payment_confirmation: { subject: "تم استلام الدفع – {orderNumber}", body: "استلمنا دفعتك للطلب {orderNumber}." },
    shipping_notification: { subject: "تم شحن طلبك {orderNumber}", body: "التتبع: {trackingNumber}" },
    delivery_notification: { subject: "تم تسليم الطلب {orderNumber}", body: "تم تسليم طلبك." },
    refund_notification: { subject: "استرداد للطلب {orderNumber}", body: "تم بدء عملية الاسترداد." },
  },
};

export function getEmailTemplate(key: EmailTemplateKey, locale: BuzzardLocale): EmailTemplate {
  return templates[locale]?.[key] ?? templates.de[key];
}

export function renderEmailTemplate(
  key: EmailTemplateKey,
  locale: BuzzardLocale,
  vars: Record<string, string>
): EmailTemplate {
  const template = getEmailTemplate(key, locale);
  const replace = (text: string) =>
    Object.entries(vars).reduce((acc, [name, value]) => acc.replaceAll(`{${name}}`, value), text);
  return {
    subject: replace(template.subject),
    body: replace(template.body),
  };
}
