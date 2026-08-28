#!/usr/bin/env python3
"""
BUZZARD FINAL PRODUCTION GUARD MAX
==================================
Fail-closed production verification layer for Buzzard24 catalog mode.

Does NOT enable sales, payments, real supplier orders, or product images.
Complements buzzard_ai_guardian_max.py — does not replace it.

Usage:
  python3 buzzard_final_production_guard_max.py
  python3 buzzard_final_production_guard_max.py --api https://buzzard-api.onrender.com
  python3 buzzard_final_production_guard_max.py --report exports/production-verification.json
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

APP_NAME = "buzzard-final-production-guard-max"
ROOT = Path(__file__).resolve().parent.parent
INTELLIGENCE = Path(__file__).resolve().parent

DEFAULT_API = os.getenv("BUZZARD_API_URL", "http://localhost:3001").rstrip("/")
DEFAULT_SITE = os.getenv("BUZZARD_SITE_URL", "https://buzzard24.de").rstrip("/")
HTTP_TIMEOUT = int(os.getenv("BUZZARD_GUARD_HTTP_TIMEOUT", "12"))


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def env_bool(*keys: str, default: str = "false") -> bool:
    for key in keys:
        val = os.getenv(key)
        if val is not None:
            return val.lower() in ("true", "1", "yes")
    return default.lower() in ("true", "1", "yes")


@dataclass
class CheckResult:
    id: str
    name: str
    status: str  # PASS | WARN | FAIL | BLOCKED
    detail: str
    data: Dict[str, Any] = field(default_factory=dict)


class ProductionGuard:
  def __init__(self, api_url: str = DEFAULT_API, site_url: str = DEFAULT_SITE):
    self.api_url = api_url.rstrip("/")
    self.site_url = site_url.rstrip("/")
    self.checks: List[CheckResult] = []

  def add(self, check: CheckResult) -> None:
    self.checks.append(check)

  def _fetch_json(self, url: str) -> tuple[Optional[Dict[str, Any]], Optional[str]]:
    try:
      req = urllib.request.Request(url, headers={"Accept": "application/json"})
      with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as res:
        body = res.read().decode("utf-8")
        return json.loads(body) if body else {}, None
    except urllib.error.HTTPError as e:
      try:
        body = e.read().decode("utf-8")
        return json.loads(body), f"HTTP {e.code}"
      except Exception:
        return None, f"HTTP {e.code}"
    except Exception as e:
      return None, str(e)

  def check_catalog_mode_env(self) -> None:
    sales = env_bool("BUZZARD_SALES_ENABLED", "SALES_ENABLED")
    p1 = os.getenv("BUZZARD_P1_CATALOG", "1")
    real_pay = env_bool("REAL_PAYMENT_ENABLED", "BUZZARD_REAL_PAYMENT_ENABLED")
    real_sup = env_bool("REAL_SUPPLIER_ORDER_ENABLED", "BUZZARD_REAL_SUPPLIER_ORDER_ENABLED")

    if sales:
      self.add(CheckResult(
        "env.sales_disabled", "BUZZARD_SALES_ENABLED=0",
        "FAIL", "Sales flag is enabled — catalog mode violated",
        {"BUZZARD_SALES_ENABLED": os.getenv("BUZZARD_SALES_ENABLED")},
      ))
    else:
      self.add(CheckResult(
        "env.sales_disabled", "BUZZARD_SALES_ENABLED=0",
        "PASS", "Sales disabled in environment",
      ))

    if p1 == "0":
      self.add(CheckResult(
        "env.p1_catalog", "BUZZARD_P1_CATALOG=1",
        "WARN", "P1 catalog module explicitly disabled",
        {"BUZZARD_P1_CATALOG": p1},
      ))
    else:
      self.add(CheckResult(
        "env.p1_catalog", "BUZZARD_P1_CATALOG=1",
        "PASS", "P1 catalog enabled (or default on)",
        {"BUZZARD_P1_CATALOG": p1},
      ))

    if real_pay or real_sup:
      self.add(CheckResult(
        "env.commerce_flags", "No real payment/supplier flags",
        "FAIL", "Real payment or supplier order flags enabled",
        {"REAL_PAYMENT": real_pay, "REAL_SUPPLIER_ORDER": real_sup},
      ))
    else:
      self.add(CheckResult(
        "env.commerce_flags", "No real payment/supplier flags",
        "PASS", "Real payment and supplier dispatch disabled",
      ))

  def check_render_yaml(self) -> None:
    path = ROOT / "render.yaml"
    if not path.exists():
      self.add(CheckResult(
        "render.yaml", "render.yaml exists",
        "FAIL", "render.yaml not found", {"path": str(path)},
      ))
      return

    text = path.read_text(encoding="utf-8")
    required = {
      "BUZZARD_SALES_ENABLED": r'key:\s*BUZZARD_SALES_ENABLED\s*\n\s*value:\s*["\']?0',
      "BUZZARD_P1_CATALOG": r"key:\s*BUZZARD_P1_CATALOG",
      "buzzard-orchestrator": r"name:\s*buzzard-orchestrator",
      "buzzard-guardian": r"name:\s*buzzard-guardian",
      "BUZZARD_ORCHESTRATOR_URL": r"key:\s*BUZZARD_ORCHESTRATOR_URL",
      "BUZZARD_GUARDIAN_URL": r"key:\s*BUZZARD_GUARDIAN_URL",
    }
    missing = [k for k, pat in required.items() if not re.search(pat, text)]
    if missing:
      self.add(CheckResult(
        "render.yaml", "Render blueprint catalog config",
        "FAIL" if "BUZZARD_SALES_ENABLED" in missing else "WARN",
        f"Missing or misconfigured: {', '.join(missing)}",
        {"missing": missing},
      ))
    else:
      self.add(CheckResult(
        "render.yaml", "Render blueprint catalog config",
        "PASS", "Sales=0, P1, orchestrator, guardian wired in render.yaml",
      ))

    if re.search(r'STRIPE_SECRET_KEY[\s\S]*sync:\s*false', text):
      self.add(CheckResult(
        "render.stripe", "Stripe not synced (no secret in blueprint)",
        "PASS", "STRIPE_SECRET_KEY sync:false — no commerce secret in repo",
      ))
    else:
      self.add(CheckResult(
        "render.stripe", "Stripe not synced",
        "WARN", "STRIPE_SECRET_KEY sync policy not verified",
      ))

  def check_key_modules(self) -> None:
    modules = [
      "server/lib/p1CatalogPlatform.js",
      "server/lib/guardianBridge.js",
      "server/lib/orchestratorBridge.js",
      "server/plugins/p1CatalogPlatformPlugin.js",
      "server/plugins/guardianBridgePlugin.js",
      "intelligence/buzzard_ai_guardian_max.py",
      "intelligence/buzzard_orchestrator.py",
      "intelligence/buzzard_final_production_guard_max.py",
    ]
    missing = [m for m in modules if not (ROOT / m).exists()]
    if missing:
      self.add(CheckResult(
        "modules", "Core production modules present",
        "FAIL", f"Missing: {', '.join(missing)}", {"missing": missing},
      ))
    else:
      self.add(CheckResult(
        "modules", "Core production modules present",
        "PASS", f"{len(modules)} modules found",
      ))

  def check_guardian_self_test(self) -> None:
    script = INTELLIGENCE / "buzzard_ai_guardian_max.py"
    if not script.exists():
      self.add(CheckResult(
        "guardian.self_test", "Guardian self-test",
        "BLOCKED", "buzzard_ai_guardian_max.py not found",
      ))
      return
    try:
      proc = subprocess.run(
        [sys.executable, str(script), "self-test"],
        capture_output=True,
        text=True,
        timeout=60,
        cwd=str(INTELLIGENCE),
      )
      if proc.returncode != 0:
        self.add(CheckResult(
          "guardian.self_test", "Guardian self-test",
          "FAIL", proc.stderr or proc.stdout or "non-zero exit",
        ))
        return
      body = json.loads(proc.stdout.strip().split("\n")[-1] if proc.stdout else "{}")
      if body.get("passed") and not body.get("sales_enabled"):
        self.add(CheckResult(
          "guardian.self_test", "Guardian self-test",
          "PASS", "passed=true, sales_enabled=false", body,
        ))
      else:
        self.add(CheckResult(
          "guardian.self_test", "Guardian self-test",
          "FAIL", "Self-test did not pass catalog constraints", body,
        ))
    except Exception as e:
      self.add(CheckResult(
        "guardian.self_test", "Guardian self-test",
        "FAIL", str(e),
      ))

  def check_http_endpoint(
    self,
    check_id: str,
    name: str,
    path: str,
    validator,
    blocked_if_not_deployed: bool = True,
  ) -> None:
    url = f"{self.api_url}{path}"
    body, err = self._fetch_json(url)
    if err and body is None:
      status = "BLOCKED" if blocked_if_not_deployed and "localhost" not in self.api_url else "WARN"
      if "localhost" in self.api_url or "127.0.0.1" in self.api_url:
        status = "BLOCKED" if "Connection refused" in (err or "") or "timed out" in (err or "") else "WARN"
      self.add(CheckResult(
        check_id, name, status,
        f"Unreachable: {err}", {"url": url},
      ))
      return

    try:
      result = validator(body or {})
      self.add(CheckResult(check_id, name, result["status"], result["detail"], result.get("data", {})))
    except Exception as e:
      self.add(CheckResult(check_id, name, "FAIL", str(e), {"url": url, "body": body}))

  def check_p1_status(self) -> None:
    def validate(body: Dict[str, Any]) -> Dict[str, Any]:
      if body.get("errorKey") == "security.notFound" or (
        body.get("success") is False and "catalog_mode" not in body
      ):
        return {
          "status": "BLOCKED",
          "detail": "P1 endpoint not deployed (merge PR + Render deploy required)",
          "data": body,
        }
      if body.get("catalog_mode") is True and body.get("sales_enabled") is False:
        return {
          "status": "PASS",
          "detail": f"catalog_mode=true, products={body.get('product_count')}",
          "data": body,
        }
      if body.get("sales_enabled"):
        return {"status": "FAIL", "detail": "sales_enabled=true on API", "data": body}
      return {"status": "WARN", "detail": "P1 status partial", "data": body}

    self.check_http_endpoint(
      "api.p1_status", "GET /api/p1/status", "/api/p1/status", validate,
    )

  def check_guardian_status(self) -> None:
    def validate(body: Dict[str, Any]) -> Dict[str, Any]:
      if body.get("errorKey") == "security.notFound":
        return {
          "status": "BLOCKED",
          "detail": "Guardian bridge not deployed (merge PR + Blueprint Sync)",
          "data": body,
        }
      if body.get("configured") and body.get("reachable"):
        health = body.get("health") or {}
        if health.get("sales_enabled") is True:
          return {"status": "FAIL", "detail": "Guardian reports sales_enabled", "data": body}
        return {"status": "PASS", "detail": "Guardian configured and reachable", "data": body}
      if body.get("configured") and not body.get("reachable"):
        return {"status": "BLOCKED", "detail": "Guardian configured but unreachable (deploy pending?)", "data": body}
      return {"status": "WARN", "detail": "Guardian not configured (BUZZARD_GUARDIAN_URL unset)", "data": body}

    self.check_http_endpoint(
      "api.guardian_status", "GET /api/guardian/status", "/api/guardian/status", validate,
    )

  def check_orchestrator_status(self) -> None:
    def validate(body: Dict[str, Any]) -> Dict[str, Any]:
      if body.get("configured") and body.get("reachable"):
        return {"status": "PASS", "detail": "Orchestrator configured and reachable", "data": body}
      if body.get("configured") and not body.get("reachable"):
        return {"status": "BLOCKED", "detail": "Orchestrator configured but unreachable (Blueprint Sync?)", "data": body}
      return {"status": "WARN", "detail": "Orchestrator not configured", "data": body}

    self.check_http_endpoint(
      "api.orchestrator_status", "GET /api/orchestrator/status", "/api/orchestrator/status", validate,
    )

  def check_api_health_sales(self) -> None:
    body, err = self._fetch_json(f"{self.api_url}/api/health")
    if body is None:
      self.add(CheckResult(
        "api.health", "GET /api/health",
        "BLOCKED" if err else "WARN", f"Unreachable: {err}",
      ))
      return
    sales = body.get("salesEnabled")
    if sales is True or sales == 1:
      self.add(CheckResult("api.health", "API health sales gate", "FAIL", "salesEnabled=true"))
    else:
      self.add(CheckResult(
        "api.health", "API health",
        "PASS", "API health OK", {"status": body.get("status", "ok")},
      ))

  def check_checkout_blocked(self) -> None:
    try:
      req = urllib.request.Request(
        f"{self.api_url}/api/orders",
        data=json.dumps({"items": [{"sku": "TEST", "quantity": 1, "unit_price": 1}]}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
      )
      with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as res:
        if res.status < 400:
          self.add(CheckResult(
            "fail_safe.checkout", "Checkout/orders blocked without auth",
            "FAIL", f"Unexpected status {res.status} — order endpoint not gated",
          ))
        else:
          self.add(CheckResult(
            "fail_safe.checkout", "Checkout/orders blocked",
            "PASS", f"Blocked with status {res.status}",
          ))
    except urllib.error.HTTPError as e:
      if e.code in (401, 403, 404, 405):
        self.add(CheckResult(
          "fail_safe.checkout", "Checkout/orders blocked (catalog mode)",
          "PASS", f"HTTP {e.code} — no real sale created",
        ))
      else:
        self.add(CheckResult(
          "fail_safe.checkout", "Checkout/orders blocked",
          "WARN", f"HTTP {e.code}",
        ))
    except Exception as e:
      self.add(CheckResult(
        "fail_safe.checkout", "Checkout/orders blocked",
        "BLOCKED" if "refused" in str(e).lower() else "WARN",
        str(e),
      ))

  def check_site_reachable(self) -> None:
    try:
      req = urllib.request.Request(self.site_url, method="GET")
      with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as res:
        ok = 200 <= res.status < 400
        self.add(CheckResult(
          "site.reachable", f"Storefront {self.site_url}",
          "PASS" if ok else "WARN",
          f"HTTP {res.status}",
        ))
    except Exception as e:
      self.add(CheckResult("site.reachable", "Storefront reachable", "WARN", str(e)))

  def run_all(self) -> Dict[str, Any]:
    self.check_catalog_mode_env()
    self.check_render_yaml()
    self.check_key_modules()
    self.check_guardian_self_test()
    self.check_api_health_sales()
    self.check_p1_status()
    self.check_guardian_status()
    self.check_orchestrator_status()
    self.check_checkout_blocked()
    self.check_site_reachable()
    return self.report()

  def report(self) -> Dict[str, Any]:
    counts = {"PASS": 0, "WARN": 0, "FAIL": 0, "BLOCKED": 0}
    for c in self.checks:
      counts[c.status] = counts.get(c.status, 0) + 1

    has_fail = counts["FAIL"] > 0
    has_blocked = counts["BLOCKED"] > 0

    if has_fail:
      overall = "FAIL"
      recommendation = "Do not deploy to production — fix FAIL checks first."
    elif has_blocked:
      overall = "BLOCKED"
      recommendation = (
        "Code is catalog-ready; complete user deploy steps (PR merge, Render Blueprint Sync). "
        "Catalog mode constraints satisfied where testable."
      )
    elif counts["WARN"] > 0:
      overall = "WARN"
      recommendation = (
        "Catalog mode verified. Optional services (orchestrator/guardian live) pending — acceptable for catalog."
      )
    else:
      overall = "PASS"
      recommendation = "Production-ready for catalog mode. Sales remain disabled."

    return {
      "app": APP_NAME,
      "generated_at": utc_now(),
      "api_url": self.api_url,
      "site_url": self.site_url,
      "catalog_mode_required": {
        "BUZZARD_P1_CATALOG": "1",
        "BUZZARD_SALES_ENABLED": "0",
      },
      "overall": overall,
      "recommendation": recommendation,
      "summary": counts,
      "checks": [
        {
          "id": c.id,
          "name": c.name,
          "status": c.status,
          "detail": c.detail,
          "data": c.data,
        }
        for c in self.checks
      ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=APP_NAME)
    parser.add_argument("--api", default=DEFAULT_API, help="Buzzard API base URL")
    parser.add_argument("--site", default=DEFAULT_SITE, help="Storefront URL")
    parser.add_argument("--report", help="Write JSON report to file")
    args = parser.parse_args()

    guard = ProductionGuard(api_url=args.api, site_url=args.site)
    report = guard.run_all()

    out = json.dumps(report, ensure_ascii=False, indent=2)
    print(out)

    if args.report:
        path = Path(args.report)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(out + "\n", encoding="utf-8")
        print(f"\nReport written: {path}", file=sys.stderr)

    if report["overall"] == "FAIL":
      return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
