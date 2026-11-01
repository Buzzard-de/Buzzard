"""Python network gate. Denied destinations never reach requests."""

from __future__ import annotations

import os
from typing import Any

import requests

from .egress_policy import EgressDenied, evaluate_egress, resolve_and_check

AUDIT: list[dict[str, Any]] = []
_MAX_AUDIT = 200


def _record(entry: dict[str, Any]) -> None:
    safe = {k: v for k, v in entry.items() if k not in {"headers", "body", "token", "authorization"}}
    AUDIT.append(safe)
    if len(AUDIT) > _MAX_AUDIT:
        del AUDIT[0]


def _without_proxy_env(fn):
    keys = (
        "HTTP_PROXY",
        "HTTPS_PROXY",
        "ALL_PROXY",
        "http_proxy",
        "https_proxy",
        "all_proxy",
    )
    saved = {k: os.environ.pop(k, None) for k in keys}
    try:
        return fn()
    finally:
        for k, v in saved.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v


def guarded_request(
    method: str,
    url: str,
    *,
    classification: str = "public",
    timeout: int = 30,
    **kwargs: Any,
) -> requests.Response:
    decision = evaluate_egress(url, classification)
    _record({"url": url, "host": decision.get("host"), "allowed": decision["allowed"], "code": decision["code"]})
    if not decision["allowed"]:
        raise EgressDenied(decision["code"], host=decision.get("host", ""), note="python_egress_denied")

    resolved = resolve_and_check(decision["host"])
    if not resolved["allowed"]:
        _record({"url": url, "host": decision["host"], "allowed": False, "code": resolved["code"]})
        raise EgressDenied(resolved["code"], host=decision["host"])

    kwargs = dict(kwargs)
    kwargs["allow_redirects"] = False
    kwargs["timeout"] = timeout
    kwargs["proxies"] = {"http": None, "https": None}

    def _do() -> requests.Response:
        session = requests.Session()
        session.trust_env = False
        return session.request(method.upper(), url, **kwargs)

    response = _without_proxy_env(_do)
    if response.is_redirect or response.status_code in (301, 302, 303, 307, 308):
        location = response.headers.get("Location") or ""
        hop = evaluate_egress(location, classification) if location else {"allowed": False, "code": "REDIRECT_DENIED", "host": ""}
        _record({"url": location, "host": hop.get("host"), "allowed": False, "code": "REDIRECT_DENIED"})
        raise EgressDenied("REDIRECT_DENIED", host=hop.get("host", ""))
    return response


def guarded_get(url: str, **kwargs: Any) -> requests.Response:
    return guarded_request("GET", url, **kwargs)


def guarded_post(url: str, **kwargs: Any) -> requests.Response:
    return guarded_request("POST", url, **kwargs)
