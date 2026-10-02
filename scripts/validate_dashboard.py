import json
import re
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
README = ROOT / "README.md"
DATA_FILE = ROOT / "data" / "github.json"

REQUIRED_DATA_FIELDS = [
    "username",
    "repositories",
    "followers",
    "stars",
    "joined",
    "fetchedAt",
]

SVG_CHECKS = [
    ROOT / "assets" / "contribution-graph.svg",
    ROOT / "assets" / "cards" / "repositories.svg",
    ROOT / "assets" / "cards" / "followers.svg",
    ROOT / "assets" / "cards" / "stars.svg",
    ROOT / "assets" / "cards" / "joined.svg",
    ROOT / "assets" / "cards" / "orderbook.svg",
    ROOT / "assets" / "cards" / "matching-engine.svg",
    ROOT / "assets" / "cards" / "brain-tumor.svg",
    ROOT / "assets" / "cards" / "compression.svg",
]


def fail(message: str) -> None:
    raise SystemExit(f"Validation failed: {message}")


def assert_local_image_refs_exist() -> None:
    if not README.exists():
        fail("README.md is missing")

    text = README.read_text(encoding="utf-8")
    refs = re.findall(r'(?:src|href)="([^"]+)"', text)
    seen = set()

    for ref in refs:
        if ref.startswith(("http://", "https://", "mailto:", "#", "data:")):
            continue
        clean = ref.strip()
        if not clean:
            continue
        if clean.startswith("/"):
            clean = clean.lstrip("/")
        candidate = (ROOT / clean).resolve()
        if candidate in seen:
            continue
        seen.add(candidate)
        if not candidate.exists():
            fail(f"Missing referenced asset: {clean}")

    if "YOUR_" in text:
        fail("README still contains placeholder URLs")


def assert_generated_data_is_valid() -> None:
    if not DATA_FILE.exists():
        fail("GitHub data file is missing")

    payload = json.loads(DATA_FILE.read_text(encoding="utf-8"))

    for field in REQUIRED_DATA_FIELDS:
        if field not in payload:
            fail(f"Missing required field in data/github.json: {field}")

    if not payload.get("username") or payload["username"] == "YOUR_GITHUB_USERNAME":
        fail("GitHub username is missing or invalid")

    for numeric_key in ["repositories", "followers", "stars"]:
        value = payload.get(numeric_key)
        if not isinstance(value, int) or value < 0:
            fail(f"Field {numeric_key} must be a non-negative integer")

    joined = payload.get("joined")
    if not isinstance(joined, int):
        fail("Field joined must be an integer year")
    if joined < 2008 or joined > datetime.now(timezone.utc).year + 1:
        fail("Field joined is outside a plausible GitHub account range")

    if payload["repositories"] == 0 and payload["followers"] == 0 and payload["stars"] == 0:
        fail("GitHub statistics appear empty or fake")

    try:
        datetime.fromisoformat(payload["fetchedAt"].replace("Z", "+00:00"))
    except (TypeError, ValueError):
        fail("Field fetchedAt is not a valid ISO-8601 timestamp")


def assert_svg_files_are_valid() -> None:
    for svg_path in SVG_CHECKS:
        if not svg_path.exists():
            fail(f"Expected generated SVG is missing: {svg_path.relative_to(ROOT)}")
        try:
            ET.parse(str(svg_path))
        except ET.ParseError as exc:
            fail(f"SVG is not valid XML: {svg_path.relative_to(ROOT)} ({exc})")


def main() -> None:
    assert_local_image_refs_exist()
    assert_generated_data_is_valid()
    assert_svg_files_are_valid()
    print("Dashboard validation passed.")


if __name__ == "__main__":
    main()
