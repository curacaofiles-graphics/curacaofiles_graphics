from curacao_scraper.graph import GraphBuilder
from curacao_scraper.parse import parse_company, parse_list, parse_other_jurisdictions

from fixtures import ALPHA_HTML, BETA_HTML, LIST_HTML, OTHER_HTML, REP_HTML


def build():
    builder = GraphBuilder("https://curacaofiles.com", "https://casinosecrets.lol")
    builder.add_list(parse_list(LIST_HTML))
    builder.add_company(parse_company(ALPHA_HTML, "10-alpha-games-n-v"))
    builder.add_company(parse_company(BETA_HTML, "11-beta-play-b-v"))
    builder.add_company(parse_company(REP_HTML, "20-rep-services-n-v"))
    builder.add_other_jurisdictions(parse_other_jurisdictions(OTHER_HTML))
    graph = builder.build()
    nodes = {n["id"]: n for n in graph["nodes"]}
    return graph, nodes


def edges_of(graph, kind):
    return [e for e in graph["edges"] if e["type"] == kind]


def test_same_person_in_two_companies_is_one_node():
    graph, nodes = build()
    johns = [n for n in nodes.values() if n["type"] == "person" and n["nameKey"] == "john q sample"]
    assert len(johns) == 1
    john = johns[0]
    assert {r["company"] for r in john["records"]} == {"c:10", "c:11"}
    targets = {e["target"] for e in edges_of(graph, "role") if e["source"] == john["id"]}
    assert targets == {"c:10", "c:11"}
    # different passports in the two filings are both kept
    assert john["passports"] == ["Moldova, Republic of", "Dominica"]
    assert john["residences"] == ["Moldova, Republic of", "Portugal"]


def test_same_name_different_birth_month_is_a_namesake():
    _, nodes = build()
    anas = [n for n in nodes.values() if n["type"] == "person" and n["nameKey"] == "ana example"]
    assert len(anas) == 2
    assert anas[0]["namesakes"] == [anas[1]["id"]]


def test_company_links_are_deduplicated_across_both_pages():
    graph, _ = build()
    reps = edges_of(graph, "representative")
    assert reps == [
        {"source": "c:10", "target": "c:20", "type": "representative", "label": "Local Representative",
         "role": "Official Representative", "since": "2024-02-08"}
    ]


def test_shared_and_foreign_domains():
    graph, nodes = build()
    (shared,) = edges_of(graph, "shared_domain")
    assert (shared["source"], shared["target"], shared["domains"]) == ("c:10", "c:11", ["alpha.example"])
    foreign = [n for n in nodes.values() if n["type"] == "foreign"]
    assert {n["label"] for n in foreign} == {"Gamma Ltd", "Delta Limited"}
    gamma = next(n for n in foreign if n["label"] == "Gamma Ltd")
    assert gamma["licences"] == [
        {"domain": "alpha.example", "licence": "ALSI-1", "detail": "B2C · valid", "issued": "2024-06-12",
         "expires": "2027-06-11"}
    ]
    (licence_edge,) = edges_of(graph, "foreign_licence")
    assert (licence_edge["source"], licence_edge["target"]) == (gamma["id"], "c:10")


def test_source_links_are_absolute():
    graph, nodes = build()
    alpha = nodes["c:10"]
    assert alpha["url"] == "https://curacaofiles.com/casinos/10-alpha-games-n-v"
    assert alpha["archive"] == "https://curacaofiles.com/api/document-archive/10?name=10-alpha-games-n-v"
    assert all(d["url"].startswith("https://curacaofiles.com/api/documents/10?") for d in alpha["documents"])
    assert graph["meta"]["mirror"] == "https://casinosecrets.lol"


def test_countries_from_passport_and_residence():
    graph, nodes = build()
    countries = {n["label"] for n in nodes.values() if n["type"] == "country"}
    assert countries == {"Moldova, Republic of", "Malta", "Spain", "Dominica", "Portugal"}
    assert edges_of(graph, "passport") and edges_of(graph, "residence")


def test_same_name_and_year_with_shared_passport_is_merged():
    builder = GraphBuilder("https://curacaofiles.com")
    builder.add_list(parse_list(LIST_HTML))

    def row(month: str, company_passport: str) -> dict:
        return {
            "group": "Qualified Person", "entity": "person", "name": "Sevket Example", "role": "UBO",
            "from": None, "until": None, "companyId": None, "addresses": [],
            "details": {"birthMonth": month, "passportCountry": company_passport},
        }

    builder._add_person("c:10", row("February 1990", "Grenada"))
    builder._add_person("c:11", row("April 1990", "Grenada"))
    builder._add_person("c:20", row("April 1971", "Grenada"))  # other year: stays separate
    graph = builder.build()
    people = [n for n in graph["nodes"] if n["type"] == "person"]
    assert len(people) == 2
    merged = next(n for n in people if len(n["records"]) == 2)
    assert sorted(merged["birthMonths"]) == ["April 1990", "February 1990"]
    roles = {e["target"] for e in graph["edges"] if e["type"] == "role" and e["source"] == merged["id"]}
    assert roles == {"c:10", "c:11"}


def test_one_letter_typo_with_same_birth_month_is_merged():
    from curacao_scraper.graph import _one_edit

    assert _one_edit("seyket ayaksiz", "sevket ayaksiz")
    assert not _one_edit("ana example", "ana examples2")
    assert not _one_edit("same", "same")


def test_split_details_writes_one_file_per_company(tmp_path):
    import json

    from curacao_scraper.cli import split_details, write_details

    graph = {
        "nodes": [
            {"id": "c:7", "type": "company", "documents": [{"name": "a.pdf"}], "applications": [], "domains": []},
            {"id": "c:8", "type": "company"},
            {"id": "p:1", "type": "person", "documents": ["kept"]},
        ]
    }
    (tmp_path / "99.json").write_text("{}", encoding="utf-8")  # stale file from an earlier build
    details = split_details(graph)
    write_details(tmp_path, details)
    assert graph["nodes"][0] == {"id": "c:7", "type": "company", "domains": [], "detailCounts": {"documents": 1}}
    assert graph["nodes"][2]["documents"] == ["kept"]
    assert sorted(p.name for p in tmp_path.iterdir()) == ["7.json"]
    assert json.loads((tmp_path / "7.json").read_text(encoding="utf-8")) == {"documents": [{"name": "a.pdf"}]}
