"""Curated media mentions ("highlights") matched onto graph nodes.

Each file in `web/public/data/highlights/*.json` describes one source (a video, an article)
and the moments in it that name brands, companies or people. Names are matched
against the scraped data; whatever cannot be found is kept as `unmatched`.

    {
      "source": {"id": "...", "title": "...", "url": "...", "publisher": "...", ...},
      "mentions": [
        {"time": "08:49", "claim": "...", "domains": ["artemisbet"],
         "companies": ["SXM Management"], "people": ["Demet Şahin"], "other": ["..."]}
      ]
    }

`domains` are brand names: "artemisbet" matches artemisbet.com, artemisbet123.net, …
"""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Any

from .util import normalize_name

_TRAILING_DIGITS = re.compile(r"\d+$")


def brand_of(domain: str) -> str:
    """'artemisbet123.com' -> 'artemisbet'."""
    first = domain.lower().split(".")[0]
    return _TRAILING_DIGITS.sub("", first.replace("-", ""))


def seconds(time: str) -> int:
    total = 0
    for part in time.split(":"):
        total = total * 60 + int(part)
    return total


def load_sources(directory: Path) -> list[dict]:
    if not directory.is_dir():
        return []
    return [json.loads(path.read_text(encoding="utf-8")) for path in sorted(directory.glob("*.json"))]


def _timestamped(url: str, time: str) -> str:
    if "youtube.com/watch" in url or "youtu.be/" in url:
        return f"{url}{'&' if '?' in url else '?'}t={seconds(time)}s"
    return url


def match(nodes: dict[str, dict[str, Any]], sources: list[dict]) -> dict:
    brands: dict[str, set[str]] = defaultdict(set)
    companies: list[tuple[str, str]] = []
    people: dict[tuple[str, ...], list[str]] = defaultdict(list)
    for node in nodes.values():
        if node["type"] == "company":
            companies.append((normalize_name(node.get("label", "")), node["id"]))
            for domain in node.get("domains") or []:
                brands[brand_of(domain["name"])].add(node["id"])
        elif node["type"] == "foreign":
            for licence in node.get("licences", []):
                brands[brand_of(licence["domain"])].add(node["id"])
        elif node["type"] == "person":
            people[tuple(sorted(node["nameKey"].split()))].append(node["id"])

    out_sources = []
    mentions = []
    for source in sources:
        info = source["source"]
        out_sources.append(info)
        for mention in source["mentions"]:
            found: list[str] = []
            unmatched: list[dict[str, str]] = []

            def add(ids: list[str] | set[str], kind: str, name: str) -> None:
                if not ids:
                    unmatched.append({"type": kind, "name": name})
                for node_id in sorted(ids):
                    if node_id not in found:
                        found.append(node_id)

            for brand in mention.get("domains", []):
                add(brands.get(brand_of(brand), set()), "domain", brand)
            for name in mention.get("companies", []):
                key = normalize_name(name)
                add([cid for label, cid in companies if label == key or label.startswith(key + " ")], "company", name)
            for name in mention.get("people", []):
                add(people.get(tuple(sorted(normalize_name(name).split())), []), "person", name)

            time = mention.get("time", "")
            mentions.append(
                {
                    "source": info["id"],
                    "time": time or None,
                    "url": _timestamped(info["url"], time) if time else info["url"],
                    "claim": mention["claim"],
                    "nodes": found,
                    "unmatched": unmatched,
                    "other": mention.get("other", []),
                    "note": mention.get("note"),
                }
            )
    return {"sources": out_sources, "mentions": mentions}
