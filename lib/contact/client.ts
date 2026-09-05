import { apiBaseUrl, isApiConfigured } from "@/lib/api/config";

export interface ContactPayload {
  name: string;
  email: string;
  message: string;
  formStarted: number;
  honey?: string;
  website?: string;
}

export async function submitContact(
  payload: ContactPayload
): Promise<{ ok: boolean; message: string; status: number }> {
  if (!isApiConfigured()) {
    return { ok: false, message: "API nicht konfiguriert", status: 0 };
  }

  const base = apiBaseUrl();
  const res = await fetch(`${base}/api/contact`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      message: payload.message,
      _formStarted: payload.formStarted,
      _honey: payload.honey || "",
      _website: payload.website || "",
    }),
  });

  const data = (await res.json().catch(() => ({}))) as { message?: string };
  return {
    ok: res.ok,
    message: data.message || (res.ok ? "OK" : "Senden fehlgeschlagen"),
    status: res.status,
  };
}
