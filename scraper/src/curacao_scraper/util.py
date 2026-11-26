"""Small text helpers shared by the parsers and the graph builder."""

from __future__ import annotations

import hashlib
import re
import unicodedata
from datetime import datetime

_SPACES = re.compile(r"\s+")
_DATE_PREFIX = re.compile(
    r"^(active from|until|registered|from|since|added|submitted:|end date:|issued:|expires:|due)\s+",
    re.IGNORECASE,
)
_DATE_FORMATS = ("%b %d, %Y", "%B %d, %Y", "%Y-%m-%d", "%Y-%m-%d %H:%M:%S")
_COMPANY_HREF = re.compile(r"/casinos/((\d+)-[^/?#]*)")


def clean(text: str | None) -> str:
    """Collapse whitespace and strip."""
    return _SPACES.sub(" ", text or "").strip()


def parse_date(text: str | None) -> str | None:
    """Turn 'Active from Apr 26, 2024' or '2024-03-08 17:42:50' into '2024-04-26'."""
    value = _DATE_PREFIX.sub("", clean(text))
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(value, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def normalize_name(name: str) -> str:
    """Case, accent and punctuation insensitive form of a name."""
    # Letters without a Unicode decomposition are folded by hand, so "Søren" matches "Soren",
    # "Łukasz" matches "Lukasz", "Đorđe" matches "Dorde" and "Yıldız" matches "Yildiz".
    decomposed = unicodedata.normalize("NFKD", name.casefold().translate(_FOLD))
    stripped = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    return clean(re.sub(r"[^\w]+", " ", stripped))


_FOLD = str.maketrans({"æ": "ae", "đ": "d", "ħ": "h", "ı": "i", "ł": "l", "ø": "o", "œ": "oe", "þ": "th"})


def short_hash(*parts: str) -> str:
    return hashlib.sha1("\x1f".join(parts).encode("utf-8")).hexdigest()[:12]


def company_ref(href: str | None) -> tuple[int, str] | None:
    """'/casinos/112-fortuna-games-n-v?tab=x' -> (112, '112-fortuna-games-n-v')."""
    match = _COMPANY_HREF.search(href or "")
    if not match:
        return None
    return int(match.group(2)), match.group(1)


# Tails of ISO-style country names that themselves contain a comma ("Moldova, Republic of").
_COUNTRY_TAILS = {
    "republic of",
    "islamic republic of",
    "the former yugoslav republic of",
    "province of china",
    "the democratic republic of the",
    "democratic republic of the",
    "bolivarian republic of",
    "federated states of",
    "plurinational state of",
    "united republic of",
    "democratic people's republic of",
    "state of",
}


def country_of(address: str | None) -> str | None:
    """Last part of an address: 'IL-GZIRA, Malta' -> 'Malta'.

    ISO-style names such as 'Moldova, Republic of' keep their suffix.
    """
    parts = [part.strip() for part in clean(address).split(",") if part.strip()]
    if not parts:
        return None
    if len(parts) >= 2 and parts[-1].casefold() in _COUNTRY_TAILS:
        return f"{parts[-2]}, {parts[-1]}"
    return parts[-1]


_SCHEME = re.compile(r"^[a-z][a-z0-9+.-]*://", re.IGNORECASE)


def clean_domain(raw: str | None) -> str:
    """' https://Example.com/en ' -> 'example.com' (registers often carry spaces, schemes or paths)."""
    value = "".join((raw or "").split())  # drops every kind of whitespace, incl. em spaces and tabs
    value = _SCHEME.sub("", value)
    value = value.split("/")[0].split("?")[0].split("#")[0]
    return value.strip(".").lower()
