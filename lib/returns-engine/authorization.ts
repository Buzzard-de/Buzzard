import { getReturnRequest, saveAuthorization, generateAuthorizationNumber } from "./registry";
import type { ReturnAuthorization } from "./types";

export function createReturnAuthorization(returnId: string): ReturnAuthorization | undefined {
  const ret = getReturnRequest(returnId);
  if (!ret || ret.status !== "APPROVED") return undefined;

  const auth: ReturnAuthorization = {
    authorizationNumber: generateAuthorizationNumber(),
    returnId: ret.returnId,
    orderId: ret.orderId,
    customerId: ret.customerId,
    items: ret.items,
    returnAddress: {
      recipientName: "Buzzard Returns",
      street: "Retourenzentrum",
      postalCode: "10115",
      city: "Berlin",
      country: ret.marketId === "DE" ? "DE" : ret.marketId,
    },
    deadline: ret.returnWindowDeadline ?? new Date(Date.now() + 14 * 86400000).toISOString(),
    instructions: "Bitte senden Sie die Ware im Originalkarton zurück. RMA-Nummer auf dem Paket angeben.",
    status: ret.status,
    createdAt: new Date().toISOString(),
  };
  saveAuthorization(auth);
  return auth;
}
