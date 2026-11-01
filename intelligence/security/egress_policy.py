"""Shared egress policy for Python intelligence / live connectors."""

from __future__ import annotations

import ipaddress
import json
import os
import socket
from pathlib import Path
from urllib.parse import urlparse

_POLICY_PATH = Path(__file__).resolve().parents[2] / "data" / "security" / "egress_policy.v1.json"


def load_policy() -> dict:
    return json.loads(_POLICY_PATH.read_text(encoding="utf-8"))


POLICY = load_policy()
ALLOWLIST = tuple(POLICY["allowlist"])
FORBIDDEN_AI_HOSTS = tuple(POLICY["forbiddenAiHosts"])
FORBIDDEN_AI_SUFFIXES = tuple(POLICY["forbiddenAiSuffixes"])
PAYMENT_SUFFIXES = tuple(POLICY["paymentHostSuffixes"])


class EgressDenied(RuntimeError):
    def __init__(self, code: str, host: str = "", note: str = ""):
        super().__init__(code)
        self.code = code
        self.host = host
        self.note = note
        self.allowed = False


def _host_of(url: str) -> str:
    try:
        return (urlparse(url).hostname or "").lower()
    except Exception:
        return ""


def is_ip_literal(host: str) -> bool:
    h = (host or "").strip("[]")
    try:
        ipaddress.ip_address(h)
        return True
    except ValueError:
        return False


def is_rebind_lookalike(host: str) -> bool:
    h = (host or "").lower()
    return (
        "127.0.0.1" in h
        or "localhost." in h
        or h.endswith(".nip.io")
        or h.endswith(".sslip.io")
        or h.endswith(".localtest.me")
    )


def is_forbidden_ai_host(host: str) -> bool:
    h = (host or "").lower()
    if not h:
        return False
    if h in FORBIDDEN_AI_HOSTS:
        return True
    return any(h == s[1:] or h.endswith(s) for s in FORBIDDEN_AI_SUFFIXES)


def is_payment_host(host: str) -> bool:
    h = (host or "").lower()
    return any(h == s.lstrip(".") or h.endswith(s if s.startswith(".") else f".{s}") for s in PAYMENT_SUFFIXES)


def extra_hosts() -> list[str]:
    raw = os.environ.get("BUZZARD_EGRESS_EXTRA_HOSTS", "")
    out = []
    for part in raw.split(","):
        h = part.strip().lower()
        if not h or "*" in h or "?" in h or h.startswith("."):
            continue
        if is_forbidden_ai_host(h) or is_payment_host(h) or is_ip_literal(h):
            continue
        out.append(h)
    return out


def is_private_or_local_host(host: str) -> bool:
    h = (host or "").lower().strip("[]")
    if is_rebind_lookalike(h):
        return True
    if h in {"localhost", "metadata.google.internal", "0.0.0.0", "::1"}:
        return True
    if h.startswith("fe80:") or h.startswith("fc") or h.startswith("fd") or h.startswith("ff"):
        return True
    try:
        ip = ipaddress.ip_address(h)
    except ValueError:
        return False
    return bool(
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


def evaluate_egress(destination_url: str, classification: str = "public") -> dict:
    try:
        parsed = urlparse(destination_url)
    except Exception:
        return {"allowed": False, "code": "INVALID_URL", "host": "", "classification": classification}
    host = (parsed.hostname or "").lower()
    if parsed.username or parsed.password:
        return {"allowed": False, "code": "URL_USERINFO_DENIED", "host": host, "classification": classification}
    if parsed.scheme != "https":
        return {"allowed": False, "code": "HTTPS_REQUIRED", "host": host, "classification": classification}
    if parsed.port not in (None, 443):
        return {"allowed": False, "code": "PORT_DENIED", "host": host, "classification": classification}
    if is_private_or_local_host(host) or is_ip_literal(host):
        return {"allowed": False, "code": "PRIVATE_OR_IP_DENIED", "host": host, "classification": classification}
    if is_forbidden_ai_host(host):
        return {"allowed": False, "code": "EXTERNAL_AI_EGRESS_DENIED", "host": host, "classification": classification}
    if is_payment_host(host):
        return {"allowed": False, "code": "PAYMENT_EGRESS_LOCKED", "host": host, "classification": classification}
    allowlisted = host in ALLOWLIST or host in extra_hosts()
    if not allowlisted:
        return {"allowed": False, "code": "HOST_NOT_ALLOWLISTED", "host": host, "classification": classification}
    return {"allowed": True, "code": "ALLOW", "host": host, "classification": classification}


def resolve_and_check(host: str) -> dict:
    try:
        infos = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    except OSError:
        return {"allowed": False, "code": "DNS_RESOLVE_FAILED", "host": host}
    for info in infos:
        addr = str(info[4][0])
        if is_private_or_local_host(addr):
            return {"allowed": False, "code": "RESOLVED_IP_DENIED", "host": host, "resolved": addr}
    return {"allowed": True, "code": "RESOLVED_OK", "host": host}
