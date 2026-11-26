"""Command line entry point.

    python -m curacao_scraper crawl   # download pages into the cache
    python -m curacao_scraper build   # parse the cache into graph.json
    python -m curacao_scraper all     # both (default)
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .fetch import MIRROR_BASE, PRIMARY_BASE, Fetcher
from .graph import GraphBuilder
from .highlights import load_sources, match
from .parse import parse_company, parse_list, parse_other_jurisdictions

ROOT = Path(__file__).resolve().parents[3]
DEFAULT_CACHE = ROOT / "scraper" / ".cache" / "html"
DEFAULT_OUT = ROOT / "web" / "public" / "data" / "graph.json"
DEFAULT_HIGHLIGHTS = ROOT / "web" / "public" / "data" / "highlights"

LIST_PATH = "/casinos/"
OTHER_PATH = "/other-jurisdictions"


def _log(message: str) -> None:
    print(message, file=sys.stderr, flush=True)


def crawl(fetcher: Fetcher, limit: int | None) -> None:
    entries = parse_list(fetcher.get(LIST_PATH))
    fetcher.get(OTHER_PATH)
    if limit is not None:
        entries = entries[:limit]
    total = len(entries)
    failures = 0
    for index, entry in enumerate(entries, 1):
        path = f"/casinos/{entry['slug']}"
        try:
            fetcher.get(path)
        except Exception as error:  # keep going; a rerun retries the missing pages
            failures += 1
            _log(f"[{index}/{total}] {path} failed: {error}")
            continue
        if index % 25 == 0 or index == total:
            _log(f"[{index}/{total}] cached (network requests so far: {fetcher.network_requests})")
    if failures:
        _log(f"{failures} pages failed; run crawl again to retry them")


DETAILS_DIR = "companies"
# Large per-company lists, loaded by the web app only when a company is opened.
DETAIL_FIELDS = ("documents", "applications")


def _dumps(value) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def split_details(graph: dict) -> dict[str, dict]:
    """Move documents and applications out of the company nodes; leave their counts behind."""
    details = {}
    for node in graph["nodes"]:
        if node["type"] != "company":
            continue
        part = {field: node.pop(field) for field in DETAIL_FIELDS if node.get(field)}
        for field in DETAIL_FIELDS:
            node.pop(field, None)
        if part:
            node["detailCounts"] = {field: len(part[field]) for field in part}
            details[node["id"]] = part
    return details


def write_details(folder: Path, details: dict[str, dict]) -> None:
    """One file per company, `companies/<company id>.json`; stale files from earlier builds are removed."""
    folder.mkdir(parents=True, exist_ok=True)
    wanted = {f"{node_id.removeprefix('c:')}.json" for node_id in details}
    for old in folder.glob("*.json"):
        if old.name not in wanted:
            old.unlink()
    for node_id, part in details.items():
        (folder / f"{node_id.removeprefix('c:')}.json").write_text(_dumps(part), encoding="utf-8")


def build(fetcher: Fetcher, out: Path, mirror: str | None, highlights: Path = DEFAULT_HIGHLIGHTS) -> dict:
    list_html = fetcher.cached(LIST_PATH)
    if list_html is None:
        raise SystemExit("list page is not cached yet; run `crawl` first")
    entries = parse_list(list_html)
    builder = GraphBuilder(PRIMARY_BASE, mirror)
    builder.add_list(entries)
    missing = 0
    for entry in entries:
        html = fetcher.cached(f"/casinos/{entry['slug']}")
        if html is None:
            missing += 1
            continue
        builder.add_company(parse_company(html, entry["slug"]))
    other_html = fetcher.cached(OTHER_PATH)
    if other_html is not None:
        builder.add_other_jurisdictions(parse_other_jurisdictions(other_html))
    graph = builder.build()
    graph["meta"]["companyPagesMissing"] = missing
    graph["highlights"] = match(builder.nodes, load_sources(highlights))
    out.parent.mkdir(parents=True, exist_ok=True)
    details = split_details(graph)
    write_details(out.parent / DETAILS_DIR, details)
    out.write_text(_dumps(graph), encoding="utf-8")
    meta = graph["meta"]
    _log(f"wrote {out} ({out.stat().st_size / 1e6:.1f} MB) and {len(details)} company detail files")
    _log(f"nodes {meta['nodeCounts']}  edges {meta['edgeCounts']}  company pages missing {missing}")
    unmatched = sum(len(m["unmatched"]) for m in graph["highlights"]["mentions"])
    _log(f"highlights: {len(graph['highlights']['mentions'])} mentions, {unmatched} names not found in the data")
    return graph


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="curacao-scraper", description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("command", nargs="?", choices=["crawl", "build", "all"], default="all")
    parser.add_argument("--mirror", action="store_true", help=f"download from {MIRROR_BASE} instead")
    parser.add_argument("--delay", type=float, default=1.5, help="seconds between requests (default 1.5)")
    parser.add_argument("--limit", type=int, help="only the first N company pages (for testing)")
    parser.add_argument("--refresh", action="store_true", help="download again even if cached")
    parser.add_argument("--cache-dir", type=Path, default=DEFAULT_CACHE)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--highlights", type=Path, default=DEFAULT_HIGHLIGHTS, help="folder of curated media mentions")
    args = parser.parse_args(argv)

    base = MIRROR_BASE if args.mirror else PRIMARY_BASE
    with Fetcher(args.cache_dir, base_url=base, delay=args.delay, refresh=args.refresh) as fetcher:
        if args.command in ("crawl", "all"):
            crawl(fetcher, args.limit)
        if args.command in ("build", "all"):
            build(fetcher, args.out, MIRROR_BASE, args.highlights)


if __name__ == "__main__":
    main()
