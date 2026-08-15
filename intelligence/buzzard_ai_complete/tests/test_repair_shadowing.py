from pathlib import Path

PACK_DIR = Path(__file__).resolve().parents[1]


def test_commerce_test_package_markers_removed():
    """Nested tests/commerce package markers must not shadow buzzard_ai_complete.commerce."""
    assert not (PACK_DIR / "tests" / "commerce" / "__init__.py").exists()
    assert not (PACK_DIR / "tests" / "commerce" / "integrations" / "__init__.py").exists()
    assert not (PACK_DIR / "tests" / "commerce" / "end_to_end" / "__init__.py").exists()
