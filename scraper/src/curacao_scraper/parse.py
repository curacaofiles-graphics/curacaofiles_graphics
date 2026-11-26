"""HTML parsers for the three kinds of pages the site has.

- `/casinos/`             -> parse_list
- `/casinos/{id}-{slug}`  -> parse_company
- `/other-jurisdictions`  -> parse_other_jurisdictions

Every parser returns plain dicts/lists so the output can go straight to JSON.
"""

from __future__ import annotations

import json
import re
from urllib.parse import parse_qs, urlparse

from parsel import Selector

from .util import clean, clean_domain, company_ref, parse_date

def _text(sel: Selector | None) -> str:
    if sel is None:
        return ""
    return clean(" ".join(sel.xpath(".//text()").getall()))


def _first(sel: Selector, query: str) -> Selector | None:
    found = sel.css(query)
    return found[0] if found else None


def _pairs(dl: Selector | None) -> list[tuple[str, Selector]]:
    """<dl><dt>Key</dt><dd>Value</dd>…</dl> -> [(key, dd selector), …]."""
    if dl is None:
        return []
    out: list[tuple[str, Selector]] = []
    key: str | None = None
    for child in dl.xpath("./dt|./dd"):
        tag = child.root.tag
        if tag == "dt":
            key = _text(child)
        elif key is not None:
            out.append((key, child))
            key = None
    return out


def _key(label: str) -> str:
    words = re.findall(r"[A-Za-z0-9]+", label)
    if not words:
        return label
    return words[0].lower() + "".join(w.capitalize() for w in words[1:])


# --------------------------------------------------------------------------- list


def parse_list(html: str) -> list[dict]:
    """All entities from `/casinos/`, with the type tab each one is listed under."""
    sel = Selector(text=html)
    entries: list[dict] = []
    for panel in sel.css("[data-type-panel]"):
        kind = panel.attrib.get("data-type-panel", "")
        for row in panel.css("a.casino-row"):
            ref = company_ref(row.attrib.get("href"))
            if not ref:
                continue
            main = _first(row, ".casino-row-main")
            spans = main.xpath("./span") if main is not None else []
            name = _text(spans[0]) if spans else ""
            license_number = None
            aliases: list[str] = []
            for span in spans[1:]:
                value = _text(span)
                if "license-number" in span.attrib.get("class", ""):
                    license_number = value
                elif value.lower().startswith("aka "):
                    aliases.append(value[4:].strip())
                elif value:
                    aliases.append(value)
            domains = row.attrib.get("data-domains")
            entries.append(
                {
                    "id": ref[0],
                    "slug": ref[1],
                    "name": name,
                    "listType": kind,
                    "license": license_number,
                    "aliases": aliases,
                    "registered": parse_date(row.attrib.get("data-registered")),
                    "activeDomains": int(domains) if domains and domains.isdigit() else None,
                }
            )
    return entries


# ------------------------------------------------------------------------ company


def parse_company(html: str, slug: str) -> dict:
    sel = Selector(text=html)
    ref = company_ref("/casinos/" + slug)
    hero = _first(sel, ".entity-hero-content")
    meta = [_text(s) for s in hero.css(".hero-meta > span")] if hero is not None else []
    registered = next((parse_date(m) for m in meta if m.lower().startswith("registered")), None)
    # The hero line holds the entity type, "aka <name>" for companies with a trade name, and the date.
    kind = next((m for m in meta if not m.lower().startswith(("registered", "aka "))), None)
    hero_aliases = [m[4:].strip() for m in meta if m.lower().startswith("aka ")]

    stats = {}
    for stat in sel.css(".stats-bar .stat"):
        label = _text(_first(stat, ".stat-label"))
        num = _text(_first(stat, ".stat-num")).replace(",", "")
        if label:
            stats[_key(label)] = int(num) if num.isdigit() else num

    markers: list = []
    raw_markers = sel.css("#entity-map::attr(data-markers)").get()
    if raw_markers:
        try:
            markers = json.loads(raw_markers)
        except json.JSONDecodeError:
            markers = []

    return {
        "id": ref[0] if ref else None,
        "slug": slug,
        "name": _text(_first(hero, "h1")) if hero is not None else "",
        "kind": kind,
        "aliases": hero_aliases,
        "registered": registered,
        "stats": stats,
        "locations": markers,
        "archive": sel.css("a.documents-download-all::attr(href)").get(),
        "documents": _documents(sel),
        "applications": [_application(p) for p in sel.css("[data-application-panel]")],
        "domains": _domains(sel),
        "people": _people(sel),
        "relatedCompanies": _related_companies(sel),
    }


def _documents(sel: Selector) -> list[dict]:
    """Document links only; the files themselves are never downloaded.

    `url` is the site-relative download link exactly as the page has it; the
    preview link is the same URL without `&download=1`.
    """
    docs = []
    for row in sel.css("article[data-document-row]"):
        folders = [
            _text(s)
            for s in row.xpath("ancestor::details[@data-document-folder]/summary/*[contains(@class,'folder-name')]")
        ]
        opener = _first(row, ".document-open")
        url = row.css(".document-actions a::attr(href)").get() or ""
        docs.append(
            {
                "name": _text(_first(row, ".document-name")),
                "folder": " / ".join(f for f in folders if f),
                "size": _text(_first(row, ".document-size")) or None,
                "type": (opener.attrib.get("data-document-type") if opener is not None else None) or None,
                "preview": opener is not None and opener.root.tag == "button",
                "url": url or None,
            }
        )
    return docs


def _application(panel: Selector) -> dict:
    header = _first(panel, ".app-header")
    dates = {}
    for span in panel.css(".app-header .dates > span"):
        label, _, value = _text(span).partition(":")
        dates[_key(label)] = parse_date(value) or clean(value)

    customer = {}
    for section in panel.css(".section"):
        if _text(_first(section, "h3")) == "Customer":
            customer = {_key(k): _text(v) for k, v in _pairs(_first(section, "dl"))}

    timeline = []
    for item in panel.css(".timeline-item"):
        summary = _first(item, ".timeline-user-details summary")
        reviewer = ""
        if summary is not None:
            reviewer = clean(" ".join(summary.xpath("./text()").getall()))
        info = [_text(s) for s in item.css(".timeline-user-info > span")]
        timeline.append(
            {
                "stage": _text(_first(item, ".timeline-row strong")),
                "date": parse_date(_text(_first(item, ".timeline-row time"))),
                "reviewer": reviewer or None,
                "alias": _text(_first(item, ".timeline-user-alias")).strip("()") or None,
                "info": [i for i in info if i],
            }
        )

    checklists = []
    for checklist in panel.css("details.checklist"):
        items = []
        for item in checklist.css(".checklist-item"):
            items.append(
                {
                    "title": _text(_first(item, ".checklist-item-title")),
                    "tag": _text(_first(item, ".checklist-item-head .tag")) or None,
                    "criticality": _text(_first(item, ".checklist-item-head .crit-pill")) or None,
                    "due": parse_date(_text(_first(item, ".due"))),
                    "description": _text(_first(item, ".checklist-item-desc")) or None,
                    "notes": _text(_first(item, ".checklist-item-notes")) or None,
                }
            )
        checklists.append(
            {
                "name": _text(_first(checklist, ".checklist-name")),
                "criticality": _text(_first(checklist, "summary .crit-pill")) or None,
                "items": items,
            }
        )

    return {
        "license": _text(_first(header, "h2")) if header is not None else "",
        "status": _text(_first(header, ".pill")) if header is not None else None,
        **dates,
        "customer": customer,
        "timeline": timeline,
        "checklists": checklists,
    }


def _domains(sel: Selector) -> list[dict]:
    domains = []
    for row in sel.css("[data-domain-row]"):
        attrs = row.attrib
        parent = None
        if "domain-row-child" in attrs.get("class", ""):
            parent = clean_domain(row.xpath("ancestor::details[contains(@class,'domain-group')][1]/@data-name").get())
        added = parse_date(attrs.get("data-added"))
        if not added:
            added = parse_date(_text(_first(row, ".domain-row-dates-cell span")))
        registrations = []
        for li in row.css(".domain-registrations li"):
            link = _first(li, "a")
            href = link.attrib.get("href") if link is not None else None
            target = company_ref(href)
            entry = {
                "jurisdiction": _text(_first(li, ".jurisdiction")),
                "holder": _text(link) if link is not None else _text(li),
            }
            if target:
                entry["companyId"] = target[0]
            elif href:
                query = parse_qs(urlparse(href).query)
                if query.get("company"):
                    entry["holder"] = query["company"][0]
            registrations.append(entry)
        raw = attrs.get("data-name", "")
        name = clean_domain(raw)
        domains.append(
            {
                "name": name,
                **({"raw": raw} if raw != name else {}),
                "status": attrs.get("data-status") or None,
                "verified": attrs.get("data-verified") == "1",
                "added": added,
                "since": parse_date(_text(_first(row, ".domain-row-since"))),
                "parent": parent,
                "registrations": registrations,
            }
        )
    return _merge_domain_rows(domains)


_STATUS_RANK = {"active": 0, "inactive": 1}


def _merge_domain_rows(rows: list[dict]) -> list[dict]:
    """One entry per domain (and parent): the register lists a re-added domain once per status period.

    The current row (active first, then the latest status date) is kept; the other periods go to `history`.
    """
    groups: dict[tuple, list[dict]] = {}
    for row in rows:
        groups.setdefault((row["name"], row["parent"]), []).append(row)
    merged = []
    for group in groups.values():
        unique = list({repr(sorted(r.items())): r for r in group}.values())
        unique.sort(key=lambda r: (_STATUS_RANK.get(r["status"] or "", 2), _neg_date(r["since"] or r["added"])))
        main = dict(unique[0])
        seen = {(r["jurisdiction"], r["holder"]) for r in main["registrations"]}
        for other in unique[1:]:
            for reg in other["registrations"]:
                if (reg["jurisdiction"], reg["holder"]) not in seen:
                    seen.add((reg["jurisdiction"], reg["holder"]))
                    main["registrations"] = [*main["registrations"], reg]
            main["verified"] = main["verified"] or other["verified"]
        history = [{"status": r["status"], "added": r["added"], "since": r["since"]} for r in unique[1:]]
        if history:
            main["history"] = history
        merged.append(main)
    return merged


def _neg_date(value: str | None) -> str:
    # Sort key that puts later ISO dates first.
    return "".join(chr(0x7F - ord(c)) for c in value) if value else ""


def _people(sel: Selector) -> list[dict]:
    """Rows of the 'Related Entities' tab: people and organisations, grouped."""
    rows = []
    for group in sel.css("[data-entity-panel='people'] section.entity-group"):
        title = _text(_first(group, ".section-head h2"))
        for row in group.css("details.entity-row"):
            avatar = row.css(".entity-avatar::attr(class)").get() or ""
            dates = [_text(s) for s in row.css(".entity-row-dates > span")]
            details: dict[str, str] = {}
            link = None
            for key, dd in _pairs(_first(row, "dl.profile-details")):
                href = dd.css("a::attr(href)").get()
                if href and company_ref(href):
                    link = company_ref(href)
                    continue
                details[_key(key)] = _text(dd)
            addresses = [
                {
                    "type": _text(_first(a, ".address-type")) or None,
                    "text": _text(_first(a, ".address-text")),
                    "verified": _text(_first(a, ".tag")) == "Verified",
                    "status": _text(_first(a, ".tag")) or None,
                }
                for a in row.css(".profile-addresses .address-row")
            ]
            rows.append(
                {
                    "group": title,
                    "entity": "person" if "entity-avatar-person" in avatar else "organization",
                    "name": _text(_first(row, ".entity-row-name")),
                    "role": _text(_first(row, ".entity-row-role")) or None,
                    "from": next((parse_date(d) for d in dates if d.lower().startswith("active from")), None),
                    "until": next((parse_date(d) for d in dates if d.lower().startswith("until")), None),
                    "details": details,
                    "addresses": addresses,
                    "companyId": link[0] if link else None,
                }
            )
    return rows


def _related_companies(sel: Selector) -> list[dict]:
    """'Related Companies' tab on representative / licensor pages."""
    rows = []
    for row in sel.css("[data-entity-panel='companies'] .company-row"):
        link = _first(row, "a.entity-row-name")
        ref = company_ref(link.attrib.get("href")) if link is not None else None
        detail = _text(_first(row, ".entity-row-details p"))
        relation, _, since = detail.partition("·")
        rows.append(
            {
                "companyId": ref[0] if ref else None,
                "name": _text(link),
                "kind": _text(_first(row, ".entity-row-role")) or None,
                "relation": clean(relation) or None,
                "from": parse_date(since),
            }
        )
    return rows


# ------------------------------------------------------------ other jurisdictions


def parse_other_jurisdictions(html: str) -> dict:
    sel = Selector(text=html)
    registers: dict[str, str] = {}
    rows = []
    for tr in sel.css("tr[data-domain-row]"):
        cells = tr.xpath("./td")
        jurisdiction = tr.attrib.get("data-jurisdiction", "")
        register = cells[0].css("a::attr(href)").get() if cells else None
        if register:
            registers[jurisdiction] = register
        details = [_text(s) for s in cells[2].css(".licence-detail")] if len(cells) > 2 else []
        issued = next((d for d in details if d.startswith("Issued:")), "")
        expires = next((d for d in details if d.startswith("Expires:")), "")
        companies = []
        if len(cells) > 3:
            for link in cells[3].css("a.company-link"):
                ref = company_ref(link.attrib.get("href"))
                if ref:
                    companies.append(ref[0])
        number = _text(_first(cells[2], ".licence-number")) if len(cells) > 2 else ""
        rows.append(
            {
                "domain": clean_domain(tr.attrib.get("data-domain", "")),
                "jurisdiction": jurisdiction,
                "holder": tr.attrib.get("data-company", ""),
                "licence": None if number.lower() == "number not listed" else number or None,
                "detail": next((d for d in details if ":" not in d), None),
                "issued": parse_date(issued) or None,
                "expires": parse_date(expires) or None,
                "companyIds": companies,
            }
        )
    return {"registers": registers, "rows": rows}
