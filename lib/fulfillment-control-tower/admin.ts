import { isSupplierOrderNetworkEnabled } from "@/lib/supplier-engine/network";
import { listFulfillmentOperationalViews, getFulfillmentOperationalView } from "./aggregator";
import { reconcileSingleFulfillment } from "./reconcile";
import { filterIncidents } from "./incidents";
import { listIncidents } from "./persistence";
import { getLastReconciliationRun, getOperationalSnapshot } from "./persistence";
import { listControlTowerAudit } from "./audit";
import { getControlTowerAnalyticsMetrics } from "./analytics";
import type {
  FulfillmentControlTowerDashboard,
  FulfillmentControlTowerDetail,
  FulfillmentControlTowerFilter,
  FulfillmentOperationalView,
} from "./types";

function applyOperationalStatus(views: FulfillmentOperationalView[]): FulfillmentOperationalView[] {
  return views.map((view) => {
    const snapshot = getOperationalSnapshot(view.fulfillmentId);
    return snapshot?.operationalStatus ? { ...view, operationalStatus: snapshot.operationalStatus } : view;
  });
}

export function getFulfillmentControlTowerDashboard(
  filter?: FulfillmentControlTowerFilter
): FulfillmentControlTowerDashboard {
  const views = applyOperationalStatus(listFulfillmentOperationalViews(filter));
  const incidents = filterIncidents({ status: "OPEN" });

  const supplierSet = new Set<string>();
  const orderSet = new Set<string>();
  for (const incident of incidents) {
    supplierSet.add(incident.supplierId);
    orderSet.add(incident.orderId);
  }

  return {
    totalFulfillments: views.length,
    healthy: views.filter((v) => v.operationalStatus === "HEALTHY").length,
    warning: views.filter((v) => v.operationalStatus === "WARNING").length,
    mismatch: views.filter((v) => v.operationalStatus === "MISMATCH").length,
    critical: views.filter((v) => v.operationalStatus === "CRITICAL").length,
    openIncidents: incidents.length,
    suppliersAffected: supplierSet.size,
    ordersAffected: orderSet.size,
    realSupplierOrderNetwork: isSupplierOrderNetworkEnabled() ? "ENABLED" : "DISABLED",
    lastReconciliationRun: getLastReconciliationRun(),
  };
}

export function listFulfillmentControlTowerRows(
  filter?: FulfillmentControlTowerFilter
): FulfillmentOperationalView[] {
  let views = applyOperationalStatus(listFulfillmentOperationalViews(filter));
  if (filter?.severity) {
    const matching = new Set(
      filterIncidents({ severity: filter.severity, status: "OPEN" }).map((i) => i.fulfillmentId)
    );
    views = views.filter((v) => matching.has(v.fulfillmentId));
  }
  if (filter?.category) {
    const matching = new Set(
      filterIncidents({ category: filter.category, status: "OPEN" }).map((i) => i.fulfillmentId)
    );
    views = views.filter((v) => matching.has(v.fulfillmentId));
  }
  return views;
}

export function getFulfillmentControlTowerDetail(fulfillmentId: string): FulfillmentControlTowerDetail | null {
  const view = getFulfillmentOperationalView(fulfillmentId);
  if (!view) return null;

  let reconciliation;
  try {
    reconciliation = reconcileSingleFulfillment(fulfillmentId);
  } catch {
    reconciliation = undefined;
  }

  return {
    fulfillment: reconciliation?.fulfillment || view,
    reconciliation: reconciliation
      ? {
          fulfillmentId: reconciliation.fulfillmentId,
          orderId: reconciliation.orderId,
          supplierId: reconciliation.supplierId,
          overallLevel: reconciliation.overallLevel,
          findings: reconciliation.findings,
          incidentFingerprints: reconciliation.incidentFingerprints,
        }
      : undefined,
    incidents: filterIncidents({ orderId: view.orderId }),
    audit: listControlTowerAudit(20),
  };
}

export function getFulfillmentControlTowerAnalyticsSummary() {
  return {
    metrics: getControlTowerAnalyticsMetrics(10),
    openIncidents: filterIncidents({ status: "OPEN" }).length,
    totalIncidents: listIncidents().length,
  };
}
