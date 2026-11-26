import pytest

from curacao_scraper.parse import parse_company, parse_list, parse_other_jurisdictions
from curacao_scraper.util import clean_domain, country_of, normalize_name, parse_date

from fixtures import ALPHA_HTML, LIST_HTML, OTHER_HTML, REP_HTML


def test_util_helpers():
    assert parse_date("Active from Apr 26, 2024") == "2024-04-26"
    assert parse_date("Registered November 8, 2023") == "2023-11-08"
    assert parse_date("2024-03-08 17:42:50") == "2024-03-08"
    assert parse_date("Not listed") is None
    assert normalize_name("  José  Q. Sample ") == "jose q sample"
    assert country_of("IL-GZIRA, Malta") == "Malta"
    assert country_of("CHISINAU, Moldova, Republic of") == "Moldova, Republic of"
    assert country_of("") is None
    assert country_of("Miami, United States") == "United States"
    assert country_of("Al Hamra Village, United Arab Emirates") == "United Arab Emirates"
    assert country_of("Taipei, Taiwan, Province of China") == "Taiwan, Province of China"
    assert clean_domain(" https://Example.com/en ") == "example.com"
    assert clean_domain("uwin.com  ") == "uwin.com"
    assert clean_domain("casino-wonder.com	") == "casino-wonder.com"


def test_parse_list():
    entries = parse_list(LIST_HTML)
    assert [e["id"] for e in entries] == [10, 11, 20]
    alpha, beta, rep = entries
    assert alpha["name"] == "Alpha Games N.V."
    assert alpha["license"] == "OGL/2024/10/0001"
    assert alpha["activeDomains"] == 2
    assert alpha["registered"] == "2024-03-08"
    assert alpha["listType"] == "B2C Operator"
    assert beta["aliases"] == ["Beta Play"]
    assert rep["listType"] == "Official Representative"


def test_parse_company_header_and_documents():
    page = parse_company(ALPHA_HTML, "10-alpha-games-n-v")
    assert page["id"] == 10
    assert page["name"] == "Alpha Games N.V."
    assert page["kind"] == "Gaming Operator"
    assert page["registered"] == "2023-11-08"
    assert page["stats"] == {"domains": 2, "relatedEntities": 3}
    assert page["archive"] == "/api/document-archive/10?name=10-alpha-games-n-v"
    pdf, sheet = page["documents"]
    assert pdf["name"] == "policy.pdf" and pdf["folder"] == "Company / Ancillary" and pdf["preview"]
    assert pdf["url"].startswith("/api/documents/10?key=companies%2F10%2Ffiles%2Fabc.pdf&name=")
    assert sheet["name"] == "sheet.xlsx" and not sheet["preview"] and sheet["size"] == "36 KB"


def test_parse_company_application():
    (app,) = parse_company(ALPHA_HTML, "10-alpha-games-n-v")["applications"]
    assert app["license"] == "OGL/2024/10/0001"
    assert app["status"] == "Granted"
    assert app["submitted"] == "2024-07-01" and app["endDate"] == "2024-07-08"
    assert app["customer"] == {"contact": "Jane Example", "email": "jane@example.org"}
    (step,) = app["timeline"]
    assert step["stage"] == "Verification" and step["date"] == "2024-04-26"
    assert step["reviewer"] == "Rev Viewer" and step["alias"] == "CGA User 1"
    assert step["info"] == ["Employee ID: E-1", "rev@example.org"]


def test_parse_company_domains():
    domains = {d["name"]: d for d in parse_company(ALPHA_HTML, "10-alpha-games-n-v")["domains"]}
    assert set(domains) == {"alpha.example", "alpha2.example", "alpha3.example"}
    alpha = domains["alpha.example"]
    assert alpha["verified"] and alpha["added"] == "2024-04-25" and alpha["since"] == "2024-08-08"
    assert alpha["registrations"] == [
        {"jurisdiction": "Curaçao", "holder": "Beta Play B.V.", "companyId": 11},
        {"jurisdiction": "Anjouan", "holder": "Gamma Ltd"},
    ]
    assert domains["alpha2.example"]["added"] == "2024-11-01"
    assert domains["alpha3.example"]["parent"] == "alpha2.example"
    assert domains["alpha3.example"]["added"] == "2026-06-01"


def test_parse_company_people():
    people = parse_company(ALPHA_HTML, "10-alpha-games-n-v")["people"]
    john, ana, rep = people
    assert john["entity"] == "person" and john["group"] == "Qualified Person"
    assert john["from"] == "2024-04-26" and john["until"] == "2025-10-28"
    assert john["details"]["birthMonth"] == "August 1989"
    assert john["addresses"][0]["verified"] is True
    assert ana["until"] is None and ana["addresses"][0]["status"] == "Unverified"
    assert rep["entity"] == "organization" and rep["companyId"] == 20
    assert rep["details"] == {"businessType": "Local Representative Provider"}


def test_parse_related_companies():
    (row,) = parse_company(REP_HTML, "20-rep-services-n-v")["relatedCompanies"]
    assert row == {
        "companyId": 10,
        "name": "Alpha Games N.V.",
        "kind": "B2C Operator",
        "relation": "Local Representative",
        "from": "2024-02-08",
    }


def test_parse_other_jurisdictions():
    data = parse_other_jurisdictions(OTHER_HTML)
    assert data["registers"] == {
        "Anjouan": "https://anjouan.example/register",
        "Kahnawà:ke": "https://kahnawake.example/permits",
    }
    gamma, delta = data["rows"]
    assert gamma["licence"] == "ALSI-1" and gamma["issued"] == "2024-06-12" and gamma["companyIds"] == [10]
    assert delta["licence"] is None and delta["issued"] is None and delta["companyIds"] == []
    assert delta["detail"] == "Permit holder"


def test_merge_domain_rows_keeps_current_period():
    from curacao_scraper.parse import _merge_domain_rows

    reg_a = {"jurisdiction": "Anjouan", "holder": "A Ltd"}
    reg_b = {"jurisdiction": "Malta", "holder": "B Ltd"}
    base = {"name": "x.example", "parent": None, "verified": False, "added": "2024-02-26"}
    rows = [
        {**base, "status": "deleted", "since": "2024-02-26", "registrations": [reg_a]},
        {**base, "status": "active", "since": "2026-04-14", "registrations": [reg_a, reg_b]},
        {**base, "status": "deleted", "since": "2024-02-26", "registrations": [reg_a]},  # exact repeat
        {**base, "name": "y.example", "status": "deleted", "since": None, "registrations": []},
    ]
    merged = _merge_domain_rows(rows)
    assert [d["name"] for d in merged] == ["x.example", "y.example"]
    x = merged[0]
    assert x["status"] == "active" and x["since"] == "2026-04-14"
    assert x["registrations"] == [reg_a, reg_b]
    assert x["history"] == [{"status": "deleted", "added": "2024-02-26", "since": "2024-02-26"}]
    assert "history" not in merged[1]


@pytest.mark.parametrize(
    ("written", "plain"),
    [
        ("Bjørn Ærø", "bjorn aero"),
        ("Đorđe Petrović", "dorde petrovic"),
        ("Ħanna Borġ", "hanna borg"),
        ("Jürgen Weiß", "jurgen weiss"),
        ("Łukasz Wiśniewski", "lukasz wisniewski"),
        ("Ştefan Ţurcanu", "stefan turcanu"),
        ("Þór Jónsson", "thor jonsson"),
        ("Yıldız Çelik", "yildiz celik"),
    ],
)
def test_normalize_name_folds_letters_of_every_alphabet(written, plain):
    assert normalize_name(written) == plain


def test_parse_company_trade_name_is_an_alias_not_a_type():
    page = parse_company(REP_HTML, "20-rep-services-n-v")
    assert page["kind"] == "Local Representative Provider"
    assert page["aliases"] == ["Rep Group"]
    assert page["registered"] == "2024-01-24"
