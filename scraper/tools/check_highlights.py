"""List what each media mention matched in the built graph, and what it did not.

    python scraper/tools/check_highlights.py [web/public/data/graph.json]

Run it after `curacao-scraper build --highlights DIR`. For every mention it prints
the timestamp, the matched nodes and the names that were not found under that
spelling, so you can add the register spelling to the highlight file.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

DEFAULT = Path(__file__).resolve().parents[2] / "web" / "public" / "data" / "graph.json"


def main() -> None:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT
    graph = json.loads(path.read_text(encoding="utf-8"))
    labels = {node["id"]: node["label"] for node in graph["nodes"]}
    highlights = graph.get("highlights") or {"sources": [], "mentions": []}
    titles = {source["id"]: source["title"] for source in highlights["sources"]}
    missing_total = 0
    current = None
    for mention in highlights["mentions"]:
        if mention["source"] != current:
            current = mention["source"]
            print(f"\n== {titles.get(current, current)} ({current})")
        matched = ", ".join(labels.get(i, i) for i in mention["nodes"]) or "-"
        missing = [u["name"] for u in mention["unmatched"]]
        missing_total += len(missing)
        print(f"  [{mention['time'] or '--'}] matched: {matched}")
        if missing:
            print(f"           not found: {', '.join(missing)}")
    print(f"\n{len(highlights['sources'])} sources, {len(highlights['mentions'])} mentions, {missing_total} names not found")


if __name__ == "__main__":
    main()
