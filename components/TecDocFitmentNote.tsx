"use client";

import { useEffect, useState } from "react";
import { useShop } from "@/lib/shop";
import { fetchTecDocCompatibility } from "@/lib/supplierHub/client";
import { isVehicleApiEnabled } from "@/lib/api/config";

interface TecDocFitmentNoteProps {
  sku: string;
}

export default function TecDocFitmentNote({ sku }: TecDocFitmentNoteProps) {
  const { vehicle } = useShop();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!vehicle?.vehicleId || !isVehicleApiEnabled() || !sku) {
      setMessage(null);
      return;
    }

    let cancelled = false;
    fetchTecDocCompatibility(sku)
      .then((rows) => {
        if (cancelled) return;
        const match = rows.some((row) => row.vehicle_id === vehicle.vehicleId);
        if (rows.length === 0) {
          setMessage("Noch keine TecDoc-Zuordnung für dieses Produkt hinterlegt.");
        } else if (match) {
          setMessage(`Passt zu Ihrem Fahrzeug (${vehicle.brand} ${vehicle.model}).`);
        } else {
          setMessage("TecDoc: Keine bestätigte Passform für das gewählte Fahrzeug.");
        }
      })
      .catch(() => {
        if (!cancelled) setMessage(null);
      });

    return () => {
      cancelled = true;
    };
  }, [sku, vehicle]);

  if (!message) return null;

  return <p className="product-fitment-note">{message}</p>;
}
