from curacao_scraper.highlights import brand_of, match, seconds

NODES = {
    "c:1": {"id": "c:1", "type": "company", "label": "Alpha Games N.V.",
            "domains": [{"name": "alphabet7.com"}, {"name": "beta-win.net"}]},
    "c:2": {"id": "c:2", "type": "company", "label": "Alphabetic Holdings B.V.", "domains": []},
    "f:1": {"id": "f:1", "type": "foreign", "label": "Gamma Ltd", "licences": [{"domain": "alphabet.org"}]},
    "p:1": {"id": "p:1", "type": "person", "label": "Şeref Yazici", "nameKey": "seref yazici"},
}

SOURCE = {
    "source": {"id": "yt-x", "title": "T", "url": "https://www.youtube.com/watch?v=x"},
    "mentions": [
        {"time": "01:02:03", "claim": "c", "domains": ["alphabet", "nowhere"], "companies": ["Alpha Games"],
         "people": ["Yazıcı Şeref", "Nobody Here"], "other": ["Someone Else"]},
    ],
}


def test_brand_and_time_helpers():
    assert brand_of("artemisbet123.com") == "artemisbet"
    assert brand_of("Mr-Bahis.net") == "mrbahis"
    assert seconds("08:49") == 529
    assert seconds("1:02:03") == 3723


def test_match_resolves_brands_companies_and_people():
    result = match(NODES, [SOURCE])
    assert result["sources"] == [SOURCE["source"]]
    (mention,) = result["mentions"]
    assert mention["url"] == "https://www.youtube.com/watch?v=x&t=3723s"
    # brand -> company and foreign holder, company prefix match, person with reversed order and dotless i
    assert mention["nodes"] == ["c:1", "f:1", "p:1"]
    assert mention["unmatched"] == [{"type": "domain", "name": "nowhere"}, {"type": "person", "name": "Nobody Here"}]
    assert mention["other"] == ["Someone Else"]
