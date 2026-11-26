"""Guess likely countries from a person's name (heuristic, every country).

Many people in the register file with second passports (Malta, Albania, Dominica,
Grenada, …), so a passport filter alone misses many nationals of a country. This
module adds a *hint*: countries whose names the person's name looks like. It is
never a statement about anyone's nationality; the viewer labels it as a guess and
only uses it when the user turns it on. Two sources are combined:

1. Learned from the data, for every country (`NameModel`): given names and surnames
   of people holding each passport. A person gets country C when both their given
   name and their surname are mostly (>= `SHARE`) seen with C passports among other
   people (their own record is left out, so nobody predicts themselves).
2. Naming patterns per country (`name_profiles.PROFILES`): language-specific letters,
   characteristic surname endings (-oğlu, -shvili, -yan, -enko, -opoulos, -escu…),
   name particles (van, bin, mac…), distinctive surnames (Borg, Nguyen, Patel…) and
   common given name + surname pairs. One pattern can point to several countries.
3. Name lists per country from Faker's dummy-data generators (`data/name_lists.json`,
   built by `scraper/tools/build_name_lists.py`, ~60 locales / ~80 countries): a name
   matches country C when its given name and its surname are both in C's lists.

Country names follow the spelling the register uses ("Russian Federation", …).
"""

from __future__ import annotations

import json
from collections.abc import Iterable
from functools import cache
from pathlib import Path

from .name_profiles import PROFILES, Profile
from .util import normalize_name

SHARE = 0.6  # a name part must be this much tied to one country
MIN_SEEN = 2  # … and seen with that country this many times (excluding the person)
_MIN_STEM = 3  # "Ian", "Ova" alone are not surnames with an ending


def _parts(name: str) -> list[str]:
    return [p for p in normalize_name(name).split() if len(p) > 1]


def _ends(word: str, endings: tuple[str, ...]) -> bool:
    return any(word.endswith(e) and len(word) - len(e) >= _MIN_STEM for e in endings)


def matches(name: str, profile: Profile) -> bool:
    """Does the name fit the profile's naming patterns?"""
    if profile.letters and any(ch in profile.letters for ch in name):
        return True
    parts = _parts(name)
    if len(parts) < 2:
        return False
    first, last = parts[0], parts[-1]
    middle = parts[1:-1]

    if _ends(last, profile.strong) or last in profile.distinct:
        return True
    if profile.particles and any(p in profile.particles for p in middle):
        return True
    if not profile.given:
        return False

    def surname_ok(word: str) -> bool:
        return word in profile.surnames or _ends(word, profile.weak) or _ends(word, profile.strong)

    # Given name + surname, in either order ("Kadir Karakuş" / "Karakuş Kadir").
    return (first in profile.given and surname_ok(last)) or (last in profile.given and surname_ok(first))


@cache
def name_lists() -> dict[str, tuple[frozenset[str], frozenset[str]]]:
    """Country -> (given names, surnames) from data/name_lists.json."""
    path = Path(__file__).with_name("data") / "name_lists.json"
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    return {
        country: (frozenset(lists["given"].split()), frozenset(lists["surnames"].split()))
        for country, lists in data["countries"].items()
    }


def guess_countries(name: str) -> list[str]:
    """Countries whose naming patterns or name lists the name fits, alphabetically."""
    found: set[str] = set()
    for profile in PROFILES:
        if matches(name, profile):
            found.update(profile.countries)
    parts = _parts(name)
    if len(parts) >= 2:
        first, last = parts[0], parts[-1]
        for country, (given, surnames) in name_lists().items():
            if (first in given and last in surnames) or (last in given and first in surnames):
                found.add(country)
    return sorted(found)


class NameModel:
    """Per-country statistics of given names and surnames, learned from passport data."""

    def __init__(self, people: Iterable[tuple[str, list[str]]]) -> None:
        self.given: dict[str, dict[str, int]] = {}
        self.surname: dict[str, dict[str, int]] = {}
        for name, passports in people:
            self._count(name, passports, +1)

    def _count(self, name: str, passports: list[str], step: int) -> None:
        parts = _parts(name)
        if len(parts) < 2:
            return
        for table, token in ((self.given, parts[0]), (self.surname, parts[-1])):
            counts = table.setdefault(token, {})
            for country in passports:
                counts[country] = counts.get(country, 0) + step

    @staticmethod
    def _tied(counts: dict[str, int] | None) -> dict[str, float]:
        if not counts:
            return {}
        total = sum(v for v in counts.values() if v > 0)
        if not total:
            return {}
        return {c: v / total for c, v in counts.items() if v >= MIN_SEEN and v / total >= SHARE}

    def guess(self, name: str, own_passports: list[str]) -> list[str]:
        """Countries both name parts are tied to, leaving the person's own record out."""
        parts = _parts(name)
        if len(parts) < 2:
            return []
        self._count(name, own_passports, -1)
        try:
            given = self._tied(self.given.get(parts[0]))
            surname = self._tied(self.surname.get(parts[-1]))
            return sorted(set(given) & set(surname), key=lambda c: -(given[c] + surname[c]))
        finally:
            self._count(name, own_passports, +1)


def guess_all(name: str, passports: list[str], model: NameModel) -> list[str]:
    """All hints for one person, alphabetically, without the passports they already hold."""
    found = set(model.guess(name, passports)) | set(guess_countries(name))
    return sorted(found - set(passports))
