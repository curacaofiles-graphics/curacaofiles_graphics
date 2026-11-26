"""Turn YouTube automatic captions (json3) into a plain transcript with timestamps.

    yt-dlp --skip-download --write-auto-subs --sub-langs "tr-orig,tr" --sub-format json3 \
        -o "VIDEO_ID.%(ext)s" "https://www.youtube.com/watch?v=VIDEO_ID"
    python scraper/tools/transcript.py VIDEO_ID.tr-orig.json3 VIDEO_ID.transcript.txt

Each output line starts with the time it begins at ("[08:49] …"), one line per
`--chunk` seconds (default 30), so a claim can be cited with the right timestamp.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def stamp(seconds: float) -> str:
    seconds = int(seconds)
    hours, rest = divmod(seconds, 3600)
    minutes, secs = divmod(rest, 60)
    return f"{hours}:{minutes:02d}:{secs:02d}" if hours else f"{minutes:02d}:{secs:02d}"


def convert(source: Path, chunk: int) -> list[str]:
    data = json.loads(source.read_text(encoding="utf-8"))
    lines: list[str] = []
    current: list[str] = []
    start: float | None = None
    for event in data.get("events", []):
        segments = event.get("segs")
        if not segments:
            continue
        text = "".join(s.get("utf8", "") for s in segments).replace("\n", " ").strip()
        if not text:
            continue
        time = event.get("tStartMs", 0) / 1000
        if start is None:
            start = time
        if time - start >= chunk and current:
            lines.append(f"[{stamp(start)}] " + " ".join(current))
            current, start = [], time
        current.append(text)
    if current and start is not None:
        lines.append(f"[{stamp(start)}] " + " ".join(current))
    return lines


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("source", type=Path, help="json3 caption file written by yt-dlp")
    parser.add_argument("out", type=Path, help="transcript text file to write")
    parser.add_argument("--chunk", type=int, default=30, help="seconds per line (default 30)")
    args = parser.parse_args()
    lines = convert(args.source, args.chunk)
    args.out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"{len(lines)} lines -> {args.out}")


if __name__ == "__main__":
    main()
