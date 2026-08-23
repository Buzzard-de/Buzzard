from __future__ import annotations

import base64
import hashlib
import re
from typing import Any

from buzzard_ai_complete.config import settings

_DANGEROUS_XML = re.compile(r"<!ENTITY|<!DOCTYPE|SYSTEM\s+[\"']|javascript:", re.IGNORECASE)
_SCRIPT_TAG = re.compile(r"<\s*script", re.IGNORECASE)
_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def enforce_import_size_limit(data: bytes | str) -> None:
    limit = settings.SUPPLIER_IMPORT_MAX_BYTES
    size = len(data) if isinstance(data, bytes) else len(data.encode("utf-8"))
    if size > limit:
        raise ValueError(f"supplier import exceeds size limit ({size} > {limit} bytes)")


def sanitize_text(value: str, *, max_length: int = 4096) -> str:
    cleaned = _CONTROL_CHARS.sub("", value.strip())
    cleaned = _SCRIPT_TAG.sub("", cleaned)
    if len(cleaned) > max_length:
        cleaned = cleaned[:max_length]
    return cleaned


def validate_xml_content(xml_text: str) -> None:
    enforce_import_size_limit(xml_text)
    if _DANGEROUS_XML.search(xml_text):
        raise ValueError("malicious XML content rejected: forbidden DTD/ENTITY")


def validate_csv_row(row: dict[str, Any]) -> dict[str, str]:
    return {k: sanitize_text(str(v)) for k, v in row.items() if k}


def encrypt_credential(plaintext: str) -> str:
    key = settings.SUPPLIER_CREDENTIALS_KEY
    if not key:
        raise ValueError("SUPPLIER_CREDENTIALS_KEY required to store supplier credentials")
    from cryptography.fernet import Fernet

    fernet_key = base64.urlsafe_b64encode(hashlib.sha256(key.encode("utf-8")).digest())
    return Fernet(fernet_key).encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_credential(ciphertext: str) -> str:
    key = settings.SUPPLIER_CREDENTIALS_KEY
    if not key:
        raise ValueError("SUPPLIER_CREDENTIALS_KEY required to decrypt supplier credentials")
    from cryptography.fernet import Fernet

    fernet_key = base64.urlsafe_b64encode(hashlib.sha256(key.encode("utf-8")).digest())
    return Fernet(fernet_key).decrypt(ciphertext.encode("utf-8")).decode("utf-8")
