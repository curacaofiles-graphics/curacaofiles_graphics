"""Regenerate src/curacao_scraper/data/name_lists.json from Faker's person-name data.

Faker (https://github.com/joke2k/faker, MIT licence) ships given names and surnames
per locale for its dummy-data generators. This tool folds them to ASCII the same
way `normalize_name` does (non-Latin scripts via anyascii, ISC licence) and writes
one list pair per country, so the name hints cover every country evenly instead of
relying on hand-written lists.

    pip install faker anyascii   # dev-only, not needed at runtime
    python scraper/tools/build_name_lists.py
"""

from __future__ import annotations

import hashlib
import importlib
import json
import sys
from pathlib import Path

from anyascii import anyascii

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from curacao_scraper.util import normalize_name  # noqa: E402

OUT = ROOT / "src" / "curacao_scraper" / "data" / "name_lists.json"

# Faker locale -> countries, spelled the way the register spells them.
LOCALES: dict[str, list[str]] = {
    "ar_AA": ["Bahrain", "Jordan", "Lebanon", "Morocco", "United Arab Emirates"],
    "ar_AE": ["United Arab Emirates"],
    "ar_JO": ["Jordan"],
    "ar_PS": ["Jordan", "Lebanon"],
    "ar_SA": ["Bahrain", "United Arab Emirates"],
    "az_AZ": ["Azerbaijan"],
    "bg_BG": ["Bulgaria"],
    "bn_BD": ["Bangladesh"],
    "cs_CZ": ["Czech Republic"],
    "da_DK": ["Denmark"],
    "de_AT": ["Austria"],
    "de_CH": ["Switzerland"],
    "de_DE": ["Germany"],
    "el_CY": ["Cyprus"],
    "el_GR": ["Greece", "Cyprus"],
    "en_AU": ["Australia"],
    "en_CA": ["Canada"],
    "en_GB": ["United Kingdom", "Isle of Man", "Gibraltar", "Jersey", "Bermuda"],
    "en_IE": ["Ireland"],
    "en_IN": ["India"],
    "en_NZ": ["New Zealand"],
    "en_PH": ["Philippines"],
    "en_US": ["United States"],
    "es_AR": ["Argentina"],
    "es_CL": ["Chile"],
    "es_CO": ["Colombia"],
    "es_ES": ["Spain", "Andorra"],
    "es_MX": ["Mexico", "El Salvador"],
    "et_EE": ["Estonia"],
    "fa_IR": ["Iran, Islamic Republic of"],
    "fi_FI": ["Finland", "Aland Islands"],
    "fil_PH": ["Philippines"],
    "fr_BE": ["Belgium"],
    "fr_CH": ["Switzerland"],
    "fr_FR": ["France", "Luxembourg"],
    "he_IL": ["Israel"],
    "hi_IN": ["India"],
    "hr_HR": ["Croatia", "Bosnia and Herzegovina"],
    "hu_HU": ["Hungary"],
    "hy_AM": ["Armenia"],
    "id_ID": ["Indonesia"],
    "it_IT": ["Italy"],
    "ja_JP": ["Japan"],
    "ka_GE": ["Georgia"],
    "ko_KR": ["Korea, Republic of"],
    "lt_LT": ["Lithuania"],
    "lv_LV": ["Latvia"],
    "ne_NP": ["Nepal"],
    "nl_BE": ["Belgium"],
    "nl_NL": ["Netherlands", "Curacao", "Netherlands Antilles"],
    "no_NO": ["Norway"],
    "pl_PL": ["Poland"],
    "pt_BR": ["Brazil"],
    "pt_PT": ["Portugal"],
    "ro_RO": ["Romania", "Moldova, Republic of"],
    "ru_RU": ["Russian Federation", "Belarus", "Kazakhstan", "Kyrgyzstan"],
    "sk_SK": ["Slovakia"],
    "sl_SI": ["Slovenia"],
    "sq_AL": ["Albania"],
    "sr_RS": ["Serbia", "Montenegro", "Serbia and Montenegro"],
    "sv_SE": ["Sweden", "Aland Islands"],
    "th_TH": ["Thailand"],
    "tr_TR": ["Turkey"],
    "uk_UA": ["Ukraine"],
    "uz_UZ": ["Uzbekistan"],
    "vi_VN": ["Viet Nam"],
    "zh_CN": ["China", "Singapore", "Malaysia"],
    "zh_TW": ["Taiwan, Province of China", "Hong Kong"],
    "zu_ZA": ["South Africa"],
    "en_ZA": ["South Africa"],
}

# Tokens left out on request, stored as sha1 prefixes so the words themselves do not appear here.
EXCLUDED_SHA1 = {"92d1f3a9780cb942", "0760a11abb4d2b52"}

GIVEN_ATTRS = ("first_names", "first_names_male", "first_names_female", "first_romanized_names")
SURNAME_ATTRS = ("last_names", "last_names_male", "last_names_female", "last_romanized_names")


def _values(provider: type, attrs: tuple[str, ...]) -> set[str]:
    out: set[str] = set()
    for attr in attrs:
        values = getattr(provider, attr, None)
        if not values or isinstance(values, property):  # some locales compute these at runtime
            continue
        for value in values:  # lists, tuples and weighted OrderedDicts all iterate names
            folded = normalize_name(anyascii(str(value)))
            for part in folded.split():
                if len(part) > 1 and hashlib.sha1(part.encode()).hexdigest()[:16] not in EXCLUDED_SHA1:
                    out.add(part)
    return out


def main() -> None:
    countries: dict[str, dict[str, set[str]]] = {}
    used = []
    for locale, targets in LOCALES.items():
        try:
            module = importlib.import_module(f"faker.providers.person.{locale}")
        except ModuleNotFoundError:
            continue
        provider = module.Provider
        given = _values(provider, GIVEN_ATTRS)
        surnames = _values(provider, SURNAME_ATTRS)
        if not given and not surnames:
            continue
        used.append(locale)
        for country in targets:
            entry = countries.setdefault(country, {"given": set(), "surnames": set()})
            entry["given"] |= given
            entry["surnames"] |= surnames

    data = {
        "source": "Faker person providers (https://github.com/joke2k/faker, MIT licence), folded to ASCII",
        "locales": sorted(used),
        "countries": {
            country: {"given": " ".join(sorted(v["given"])), "surnames": " ".join(sorted(v["surnames"]))}
            for country, v in sorted(countries.items())
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=True, indent=1) + "\n", encoding="utf-8")
    sizes = {c: (len(v["given"].split()), len(v["surnames"].split())) for c, v in data["countries"].items()}
    print(f"{len(used)} locales -> {len(sizes)} countries -> {OUT}")
    for country, (g, s) in sizes.items():
        print(f"  {country}: {g} given, {s} surnames")


if __name__ == "__main__":
    main()
