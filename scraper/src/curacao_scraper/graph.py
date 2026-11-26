"""Turn parsed pages into one graph document (nodes + edges + metadata).

Node ids
    c:<id>                 Curaçao register entity (has a page on the site)
    p:<hash>               person (deduplicated by name + birth month, see `person_key`)
    o:<hash>               organisation listed without a page of its own
    f:<hash>               licence holder in another jurisdiction (Anjouan, Kahnawà:ke)
    k:<hash>               country (passport / residence)

Edge types
    role                   person or organisation -> company (Qualified Person, …)
    representative         company -> its local representative
    master_licensor        company -> its master licensor
    related                any other company -> company link
    shared_domain          company <-> company, same domain in both records
    foreign_licence        foreign licence holder <-> company, same domain
    passport, residence    person -> country
"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from .name_profiles import PROFILES
from .names import NameModel, guess_all, name_lists
from .util import country_of, normalize_name, short_hash

DISCLAIMER = (
    "The inclusion of a person, company, domain, or other entity in the CasinoSecrets database does not "
    "imply illegal or improper conduct. The data was extracted directly from relevant gambling authorities "
    "and official registers on the basis of a significant public interest and reflects information available "
    "up to August 2026. Records may be incomplete, outdated, or contain errors from the underlying source "
    "systems. Please verify identities using company numbers, addresses, domains, licence details, or other "
    "identifying information before drawing conclusions."
)

_RELATION_TYPES = {
    "local representative": "representative",
    "official representative": "representative",
    "master licensor": "master_licensor",
}


def person_key(name: str, details: dict[str, str]) -> str:
    """Same person = same normalized name + birth month.

    The site has no person ids. Passport country is not part of the key: the same
    person often files with different passports (e.g. a Ukrainian and a Maltese one)
    in different companies. Without a birth month the passport country is used instead.
    """
    birth = (details.get("birthMonth") or "").casefold()
    if birth:
        return short_hash(normalize_name(name), birth)
    return short_hash(normalize_name(name), "", normalize_name(details.get("passportCountry") or ""))


def _one_edit(a: str, b: str) -> bool:
    """True when the strings differ by exactly one inserted, deleted or replaced character."""
    if a == b or abs(len(a) - len(b)) > 1:
        return False
    if len(a) > len(b):
        a, b = b, a
    i = j = edits = 0
    while i < len(a) and j < len(b):
        if a[i] == b[j]:
            i += 1
            j += 1
            continue
        edits += 1
        if edits > 1:
            return False
        if len(a) == len(b):
            i += 1
        j += 1
    return edits + (len(b) - j) + (len(a) - i) <= 1


class GraphBuilder:
    def __init__(self, base_url: str, mirror_url: str | None = None) -> None:
        self.base_url = base_url.rstrip("/")
        self.mirror_url = mirror_url.rstrip("/") if mirror_url else None
        self.nodes: dict[str, dict[str, Any]] = {}
        self.edges: dict[tuple[str, str, str], dict[str, Any]] = {}
        self.registers: dict[str, str] = {}

    # ---------------------------------------------------------------- helpers

    def _edge(self, source: str, target: str, kind: str, undirected: bool = False, **attrs: Any) -> dict:
        if undirected and target < source:
            source, target = target, source
        key = (source, target, kind)
        edge = self.edges.get(key)
        if edge is None:
            edge = {"source": source, "target": target, "type": kind}
            self.edges[key] = edge
        for name, value in attrs.items():
            if value is not None and edge.get(name) is None:
                edge[name] = value
        return edge

    def _country(self, name: str | None) -> str | None:
        if not name:
            return None
        node_id = "k:" + short_hash(normalize_name(name))
        self.nodes.setdefault(node_id, {"id": node_id, "type": "country", "label": name})
        return node_id

    def _company_stub(self, company_id: int, name: str = "", kind: str | None = None) -> str:
        node_id = f"c:{company_id}"
        node = self.nodes.setdefault(node_id, {"id": node_id, "type": "company", "companyId": company_id})
        if name and not node.get("label"):
            node["label"] = name
        if kind and not node.get("kind"):
            node["kind"] = kind
        return node_id

    # ----------------------------------------------------------------- inputs

    def add_list(self, entries: list[dict]) -> None:
        for entry in entries:
            node_id = self._company_stub(entry["id"], entry["name"])
            node = self.nodes[node_id]
            node.update(
                {
                    "label": entry["name"],
                    "slug": entry["slug"],
                    "listType": entry["listType"],
                    "license": entry["license"],
                    "aliases": entry["aliases"],
                    "registered": entry["registered"],
                    "activeDomains": entry["activeDomains"],
                    "url": f"{self.base_url}/casinos/{entry['slug']}",
                }
            )

    def add_company(self, page: dict) -> None:
        node_id = self._company_stub(page["id"], page["name"], page["kind"])
        node = self.nodes[node_id]
        aliases = list(dict.fromkeys([*(node.get("aliases") or []), *page.get("aliases", [])]))
        if aliases:
            node["aliases"] = aliases
        if page["locations"]:  # the source's map markers (empty on every page so far)
            node["locations"] = page["locations"]
        node.update(
            {
                "label": page["name"] or node.get("label"),
                "slug": page["slug"],
                "kind": page["kind"],
                "registered": page["registered"] or node.get("registered"),
                "stats": page["stats"],
                "url": f"{self.base_url}/casinos/{page['slug']}",
                "archive": self.base_url + page["archive"] if page["archive"] else None,
                "documents": [
                    {**doc, "url": self.base_url + doc["url"] if doc["url"] else None} for doc in page["documents"]
                ],
                "applications": page["applications"],
                "domains": page["domains"],
                "scraped": True,
            }
        )

        for row in page["people"]:
            if row["entity"] == "person":
                self._add_person(node_id, row)
            elif row["companyId"] is not None:
                other = self._company_stub(row["companyId"], row["name"], row["details"].get("businessType"))
                kind = _RELATION_TYPES.get((row["group"] or "").casefold(), "related")
                self._edge(node_id, other, kind, label=row["group"], role=row["role"], since=row["from"],
                           until=row["until"])
            else:
                org_id = "o:" + short_hash(normalize_name(row["name"]))
                org = self.nodes.setdefault(org_id, {"id": org_id, "type": "organization", "label": row["name"]})
                org.setdefault("details", row["details"])
                self._edge(org_id, node_id, "role", label=row["group"], role=row["role"], since=row["from"],
                           until=row["until"])

        for row in page["relatedCompanies"]:
            if row["companyId"] is None:
                continue
            other = self._company_stub(row["companyId"], row["name"], row["kind"])
            kind = _RELATION_TYPES.get((row["relation"] or "").casefold(), "related")
            self._edge(other, node_id, kind, label=row["relation"], since=row["from"])

        for domain in page["domains"]:
            for reg in domain["registrations"]:
                if reg.get("companyId") is not None and reg["companyId"] != page["id"]:
                    other = self._company_stub(reg["companyId"], reg.get("holder", ""))
                    edge = self._edge(node_id, other, "shared_domain", undirected=True)
                    domains = edge.setdefault("domains", [])
                    if domain["name"] not in domains:
                        domains.append(domain["name"])
                elif reg.get("companyId") is None and reg.get("holder"):
                    self._add_foreign_holder(reg["jurisdiction"], reg["holder"], domain["name"], node_id)

    def _add_person(self, company_node: str, row: dict) -> None:
        details = row["details"]
        node_id = "p:" + person_key(row["name"], details)
        node = self.nodes.setdefault(
            node_id,
            {
                "id": node_id,
                "type": "person",
                "label": row["name"],
                "nameKey": normalize_name(row["name"]),
                "birthMonth": details.get("birthMonth"),
                "passports": [],
                "residences": [],
                "records": [],
            },
        )
        node["records"].append(
            {
                "company": company_node,
                "group": row["group"],
                "role": row["role"],
                "from": row["from"],
                "until": row["until"],
                "details": details,
                "addresses": row["addresses"],
            }
        )
        self._edge(node_id, company_node, "role", label=row["group"], role=row["role"], since=row["from"],
                   until=row["until"])
        passport_name = details.get("passportCountry")
        passport = self._country(passport_name)
        if passport:
            self._edge(node_id, passport, "passport")
            if passport_name not in node["passports"]:
                node["passports"].append(passport_name)
        for address in row["addresses"]:
            country = country_of(address["text"])
            residence = self._country(country)
            if residence:
                self._edge(node_id, residence, "residence", label=address["type"])
                if country not in node["residences"]:
                    node["residences"].append(country)

    def _add_foreign_holder(self, jurisdiction: str, holder: str, domain: str, company_node: str | None,
                            licence: dict | None = None) -> str:
        node_id = "f:" + short_hash(jurisdiction.casefold(), normalize_name(holder))
        node = self.nodes.setdefault(
            node_id,
            {"id": node_id, "type": "foreign", "label": holder, "jurisdiction": jurisdiction, "licences": []},
        )
        known = {lic["domain"] for lic in node["licences"]}
        if domain not in known:
            node["licences"].append(licence or {"domain": domain})
        elif licence:
            for lic in node["licences"]:
                if lic["domain"] == domain:
                    lic.update(licence)
        if company_node:
            edge = self._edge(node_id, company_node, "foreign_licence", label=jurisdiction)
            domains = edge.setdefault("domains", [])
            if domain not in domains:
                domains.append(domain)
        return node_id

    def add_other_jurisdictions(self, data: dict) -> None:
        self.registers = data["registers"]
        for row in data["rows"]:
            licence = {k: row[k] for k in ("domain", "licence", "detail", "issued", "expires")}
            companies = row["companyIds"] or [None]
            for company_id in companies:
                company_node = self._company_stub(company_id) if company_id is not None else None
                node_id = self._add_foreign_holder(row["jurisdiction"], row["holder"], row["domain"], company_node,
                                                   licence)
                self.nodes[node_id]["register"] = data["registers"].get(row["jurisdiction"])

    # ----------------------------------------------------------------- output

    def _merge_probable_duplicates(self) -> None:
        """Merge people with the same name and birth year who share a passport or residence country.

        Filings often disagree by a month or two on the birth month (typing errors), which
        splits one person into two nodes. Merged nodes keep every birth month seen in
        `birthMonths` and say why they were merged.
        """
        by_name: dict[str, list[dict]] = defaultdict(list)
        for node in self.nodes.values():
            if node["type"] == "person":
                by_name[node["nameKey"]].append(node)
        # One-letter typos ("Seyket" / "Sevket") with the same birth month join the same group.
        keys = sorted(by_name, key=len)
        alias: dict[str, str] = {}
        by_birth: dict[str, list[str]] = defaultdict(list)
        for key in keys:
            for node in by_name[key]:
                if node.get("birthMonth"):
                    by_birth[node["birthMonth"]].append(key)
        for names in by_birth.values():
            unique = sorted(set(names))
            for i, a in enumerate(unique):
                for b in unique[i + 1:]:
                    if len(a) >= 8 and alias.get(b, b) == b and _one_edit(a, b):
                        alias[b] = alias.get(a, a)
        for key, root in alias.items():
            if key in by_name and root in by_name:
                by_name[root].extend(by_name.pop(key))
        renamed: dict[str, str] = {}
        for group in by_name.values():
            if len(group) < 2:
                continue
            group.sort(key=lambda n: -len(n["records"]))
            kept: list[dict] = []
            for node in group:
                year = (node.get("birthMonth") or "").split()[-1:] or [""]
                target = next(
                    (
                        k
                        for k in kept
                        if year[0]
                        and (k.get("birthMonth") or "").endswith(year[0])
                        and (set(k["passports"]) & set(node["passports"]) or set(k["residences"]) & set(node["residences"]))
                    ),
                    None,
                )
                if target is None:
                    kept.append(node)
                    continue
                months = target.setdefault("birthMonths", [target["birthMonth"]])
                if node["birthMonth"] not in months:
                    months.append(node["birthMonth"])
                target["mergedReason"] = (
                    "same name (or one-letter spelling difference) and birth year, shared passport or residence country"
                )
                target["records"].extend(node["records"])
                for key in ("passports", "residences"):
                    target[key].extend(c for c in node[key] if c not in target[key])
                renamed[node["id"]] = target["id"]
                del self.nodes[node["id"]]
        if not renamed:
            return
        edges = list(self.edges.values())
        self.edges = {}
        for edge in edges:
            source = renamed.get(edge["source"], edge["source"])
            target = renamed.get(edge["target"], edge["target"])
            attrs = {k: v for k, v in edge.items() if k not in ("source", "target", "type")}
            self._edge(source, target, edge["type"], **attrs)

    def _link_namesakes(self) -> None:
        """Different person nodes with the same name are flagged as possible matches."""
        by_name: dict[str, list[str]] = defaultdict(list)
        for node in self.nodes.values():
            if node["type"] == "person":
                by_name[node["nameKey"]].append(node["id"])
        for ids in by_name.values():
            if len(ids) > 1:
                for node_id in ids:
                    self.nodes[node_id]["namesakes"] = [i for i in ids if i != node_id]

    def _guess_name_countries(self) -> None:
        """Heuristic hint from names (see names.py). Never replaces passport data."""
        people = [n for n in self.nodes.values() if n["type"] == "person"]
        model = NameModel((n["label"], n["passports"]) for n in people)
        for node in people:
            guesses = guess_all(node["label"], node["passports"], model)
            if guesses:
                node["nameCountries"] = guesses

    def _drop_unknown_residences(self) -> None:
        """Keep residence countries that are real country names (seen as a passport country).

        Some addresses carry only a city ("Dubai") or placeholders; those must not become countries.
        """
        known = {c for n in self.nodes.values() if n["type"] == "person" for c in n["passports"]}
        known |= set(name_lists()) | {c for profile in PROFILES for c in profile.countries}
        for node in self.nodes.values():
            if node["type"] == "person":
                node["residences"] = [c for c in node["residences"] if c in known]
        country_ids = {n["id"] for n in self.nodes.values() if n["type"] == "country" and n["label"] in known}
        self.edges = {
            k: e for k, e in self.edges.items() if e["type"] != "residence" or e["target"] in country_ids
        }
        used = {e["target"] for e in self.edges.values() if e["type"] in ("passport", "residence")}
        for node_id in [i for i, n in self.nodes.items() if n["type"] == "country" and i not in used]:
            del self.nodes[node_id]

    def build(self) -> dict:
        self._merge_probable_duplicates()
        self._drop_unknown_residences()
        self._link_namesakes()
        self._guess_name_countries()
        for node in self.nodes.values():
            if node["type"] == "company" and not node.get("label"):
                node["label"] = f"#{node['companyId']}"
        counts: dict[str, int] = defaultdict(int)
        for node in self.nodes.values():
            counts[node["type"]] += 1
        edge_counts: dict[str, int] = defaultdict(int)
        for edge in self.edges.values():
            edge_counts[edge["type"]] += 1
        return {
            "meta": {
                "source": self.base_url,
                "mirror": self.mirror_url,
                "title": "Casino Secrets",
                "publisher": "Lilith Wittmann",
                "investigation": "https://www.lilithwittmann.de/series/casinosecrets/",
                "registers": self.registers,
                "disclaimer": DISCLAIMER,
                "generated": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
                "nodeCounts": dict(sorted(counts.items())),
                "edgeCounts": dict(sorted(edge_counts.items())),
            },
            "nodes": sorted(self.nodes.values(), key=lambda n: n["id"]),
            "edges": sorted(self.edges.values(), key=lambda e: (e["source"], e["target"], e["type"])),
        }
