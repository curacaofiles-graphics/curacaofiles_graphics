"""Polite, cached HTTP fetching.

One request at a time, a fixed pause between network requests, and every page
is kept on disk so a rerun only downloads what is missing.
"""

from __future__ import annotations

import time
from pathlib import Path
from urllib.parse import quote

import httpx

PRIMARY_BASE = "https://curacaofiles.com"
MIRROR_BASE = "https://casinosecrets.lol"
USER_AGENT = "curacaofiles-graphics-scraper/0.1 (open-source research tool)"
RETRY_STATUSES = {429, 500, 502, 503, 504}


class Fetcher:
    def __init__(
        self,
        cache_dir: Path,
        base_url: str = PRIMARY_BASE,
        delay: float = 1.5,
        refresh: bool = False,
        retries: int = 4,
        timeout: float = 60.0,
    ) -> None:
        self.cache_dir = cache_dir
        self.base_url = base_url.rstrip("/")
        self.delay = delay
        self.refresh = refresh
        self.retries = retries
        self.network_requests = 0
        self._last_request = 0.0
        self._client = httpx.Client(
            headers={"User-Agent": USER_AGENT},
            timeout=timeout,
            follow_redirects=True,
        )

    def __enter__(self) -> Fetcher:
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    def close(self) -> None:
        self._client.close()

    def cache_path(self, path: str) -> Path:
        name = quote(path.strip("/") or "index", safe="-_.") + ".html"
        return self.cache_dir / name

    def cached(self, path: str) -> str | None:
        file = self.cache_path(path)
        return file.read_text(encoding="utf-8") if file.exists() else None

    def get(self, path: str) -> str:
        """Return the page at `path` (e.g. '/casinos/'), from cache when possible."""
        file = self.cache_path(path)
        if file.exists() and not self.refresh:
            return file.read_text(encoding="utf-8")
        text = self._download(path)
        file.parent.mkdir(parents=True, exist_ok=True)
        tmp = file.with_suffix(".part")
        tmp.write_text(text, encoding="utf-8")
        tmp.replace(file)
        return text

    def _download(self, path: str) -> str:
        url = self.base_url + path
        for attempt in range(self.retries + 1):
            wait = self.delay - (time.monotonic() - self._last_request)
            if wait > 0:
                time.sleep(wait)
            self._last_request = time.monotonic()
            self.network_requests += 1
            try:
                response = self._client.get(url)
            except httpx.TransportError:
                if attempt == self.retries:
                    raise
            else:
                if response.status_code not in RETRY_STATUSES:
                    response.raise_for_status()
                    return response.text
                if attempt == self.retries:
                    response.raise_for_status()
            time.sleep(self.delay * 2 ** (attempt + 1))
        raise RuntimeError("unreachable")
