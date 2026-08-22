"""Commerce configuration validation — no external API contact."""

from __future__ import annotations

import pytest

from buzzard_ai_complete.ai_core.integrations.commerce_config import (
    commerce_staging_ready,
    validate_commerce_configuration,
)


def test_commerce_config_unconfigured_honest_errors(monkeypatch):
    import buzzard_ai_complete.config.settings as settings

    monkeypatch.delenv("COMMERCE_API_URL", raising=False)
    monkeypatch.delenv("COMMERCE_API_TOKEN", raising=False)
    settings.COMMERCE_API_URL = ""
    settings.COMMERCE_API_TOKEN = ""

    status = validate_commerce_configuration()
    assert not status.configured
    assert not status.valid
    assert "COMMERCE_API_URL is not set" in status.errors
    assert "COMMERCE_API_TOKEN is not set" in status.errors
    assert not commerce_staging_ready()


def test_commerce_config_valid_when_env_present(monkeypatch):
    import buzzard_ai_complete.config.settings as settings

    monkeypatch.setenv("COMMERCE_API_URL", "https://commerce-staging.buzzard.example")
    monkeypatch.setenv("COMMERCE_API_TOKEN", "staging-token")
    settings.COMMERCE_API_URL = "https://commerce-staging.buzzard.example"
    settings.COMMERCE_API_TOKEN = "staging-token"

    status = validate_commerce_configuration()
    assert status.configured
    assert status.valid
    assert status.errors == ()
    assert commerce_staging_ready()


def test_commerce_config_rejects_invalid_url(monkeypatch):
    import buzzard_ai_complete.config.settings as settings

    monkeypatch.setenv("COMMERCE_API_URL", "not-a-url")
    monkeypatch.setenv("COMMERCE_API_TOKEN", "token")
    settings.COMMERCE_API_URL = "not-a-url"
    settings.COMMERCE_API_TOKEN = "token"

    status = validate_commerce_configuration()
    assert not status.valid
    assert any("http" in err.lower() for err in status.errors)


def test_ready_endpoint_includes_commerce_config(monkeypatch):
    import buzzard_ai_complete.config.settings as settings
    from buzzard_ai_complete.api.app import app
    from fastapi.testclient import TestClient

    monkeypatch.setenv("BUZZARD_AI_CORE_V3", "1")
    settings.BUZZARD_AI_CORE_V3 = True

    client = TestClient(app)
    response = client.get("/api/v1/health/ready")
    assert response.status_code == 200
    body = response.json()
    assert "commerce_config" in body
    assert "configured" in body["commerce_config"]
    assert "valid" in body["commerce_config"]
