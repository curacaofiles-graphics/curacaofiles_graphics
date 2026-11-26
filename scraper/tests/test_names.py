import pytest

from curacao_scraper.names import NameModel, guess_all, guess_countries

# (register country, name): the name must suggest that country. Alphabetical by country.
# Several cases per country cover the different signals: distinctive letters, given name + surname lists,
# surname endings (patronymics, -poulos, -shvili, -yan, -oğlu…), particles (van, de, O') and reversed order.
SUGGESTS = [
    ("Albania", "Arben Hoxha"),
    ("Albania", "Besnik Krasniqi"),
    ("Armenia", "Aram Petrosyan"),
    ("Armenia", "Gor Grigoryan"),
    ("Armenia", "Petrosyan Aram"),  # reversed order
    ("Azerbaijan", "Elvin Mammadov"),
    ("Azerbaijan", "Rashad Aliyev"),
    ("Belgium", "Pieter Janssens"),
    ("Brazil", "Gabriel Oliveira"),
    ("Brazil", "João Silva"),
    ("Bulgaria", "Georgi Dimitrov"),
    ("Bulgaria", "Ivan Petrov"),
    ("China", "Wei Zhang"),
    ("Croatia", "Ivan Horvat"),
    ("Croatia", "Đuro Kovačević"),  # distinctive letter
    ("Cyprus", "Andreas Georgiou"),
    ("Cyprus", "Stavros Christodoulou"),
    ("Czech Republic", "Jiří Dvořák"),  # distinctive letters
    ("Czech Republic", "Petr Novák"),
    ("Denmark", "Lars Nielsen"),
    ("Denmark", "Søren Jørgensen"),
    ("Estonia", "Kristjan Saar"),
    ("Finland", "Jukka Korhonen"),
    ("Finland", "Mikko Virtanen"),
    ("France", "François Lefèvre"),
    ("France", "Jean Dupont"),
    ("Georgia", "Davit Gelashvili"),  # -shvili
    ("Georgia", "Giorgi Beridze"),
    ("Georgia", "Tamar Lomidze"),
    ("Germany", "Heinz Weiß"),  # distinctive letter
    ("Germany", "Jürgen Müller"),
    ("Germany", "Klaus Schmidt"),
    ("Greece", "Dimitrios Konstantinou"),
    ("Greece", "Giorgos Papadakis"),
    ("Greece", "Nikos Papadopoulos"),  # -poulos
    ("Hungary", "Gábor Szőke"),  # distinctive letter
    ("Hungary", "László Kovács"),
    ("India", "Priya Patel"),
    ("India", "Rahul Sharma"),
    ("Ireland", "Sean O'Brien"),  # particle
    ("Ireland", "Siobhan Murphy"),
    ("Israel", "Moshe Cohen"),
    ("Israel", "Yossi Levi"),
    ("Italy", "Giuseppe Rossi"),
    ("Italy", "Marco Bianchi"),
    ("Japan", "Hiroshi Tanaka"),
    ("Kazakhstan", "Aidos Nurlanov"),
    ("Kazakhstan", "Nursultan Abenov"),
    ("Korea, Republic of", "Minjun Kim"),
    ("Latvia", "Andris Ozols"),
    ("Latvia", "Jānis Bērziņš"),  # distinctive letters
    ("Lithuania", "Jonas Petrauskas"),
    ("Lithuania", "Tomas Kazlauskas"),
    ("Macedonia, the Former Yugoslav Republic of", "Goran Stojanovski"),
    ("Malta", "Joseph Borg"),
    ("Malta", "Mario Camilleri"),
    ("Mexico", "Juan Hernández"),
    ("Montenegro", "Milo Vukotić"),
    ("Netherlands", "Daan de Vries"),  # particle
    ("Netherlands", "Jan van Dijk"),
    ("Nigeria", "Chibuike Okafor"),
    ("Nigeria", "Oluwaseun Adeyemi"),
    ("Norway", "Bjørn Johansen"),
    ("Norway", "Ole Hansen"),
    ("Poland", "Mateusz Nowak"),
    ("Poland", "Piotr Kowalski"),
    ("Poland", "Łukasz Wiśniewski"),  # distinctive letters
    ("Portugal", "Rui Gonçalves"),
    ("Romania", "Andrei Ionescu"),
    ("Romania", "Ștefan Popescu"),  # distinctive letter
    ("Russian Federation", "Dmitry Smirnov"),
    ("Russian Federation", "Sergey Ivanov"),
    ("Serbia", "Marko Petrović"),
    ("Serbia", "Nikola Jovanović"),
    ("Slovakia", "Tomáš Kováč"),
    ("Slovenia", "Janez Novak"),
    ("Spain", "Javier Fernández"),
    ("Spain", "José García"),
    ("Sweden", "Björn Lindqvist"),
    ("Sweden", "Erik Andersson"),
    ("Turkey", "Ayse Yildiz"),  # same name without the distinctive letters
    ("Turkey", "Ayşe Yıldız"),  # distinctive letters
    ("Turkey", "Burak Ozturk"),  # weak ending with a known given name
    ("Turkey", "Demir Mustafa"),  # reversed order
    ("Turkey", "Emre Karaosmanoğlu"),  # -oğlu
    ("Ukraine", "Hryhoriy Bondarenko"),
    ("Ukraine", "Kovalenko Oleksandr"),  # reversed order
    ("Ukraine", "Olena Shevchenko"),
    ("United Kingdom", "John Smith"),
    ("United Kingdom", "Oliver Taylor"),
    ("United States", "Michael Johnson"),
    ("Viet Nam", "Thi Nguyen"),
    ("Viet Nam", "Van Tran"),
]

# Names whose signals belong to one country only.
ONLY = [
    ("Albania", "Arben Hoxha"),
    ("Armenia", "Aram Petrosyan"),
    ("Estonia", "Kristjan Saar"),
    ("Georgia", "Giorgi Beridze"),
    ("Hungary", "László Kovács"),
    ("Ireland", "Siobhan Murphy"),
    ("Israel", "Moshe Cohen"),
    ("Japan", "Hiroshi Tanaka"),
    ("Korea, Republic of", "Minjun Kim"),
    ("Latvia", "Jānis Bērziņš"),
    ("Lithuania", "Jonas Petrauskas"),
    ("Poland", "Piotr Kowalski"),
    ("Portugal", "Rui Gonçalves"),
    ("Slovakia", "Tomáš Kováč"),
    ("Slovenia", "Janez Novak"),
    ("Turkey", "Ayşe Yıldız"),
    ("Ukraine", "Olena Shevchenko"),
    ("Viet Nam", "Van Tran"),
]

# A given name alone is not enough evidence.
GIVEN_NAME_ONLY = ["Aram", "Giorgi", "Klaus", "Marco", "Mehmet", "Nikos", "Olena", "Piotr", "Sergey"]


@pytest.mark.parametrize(("country", "name"), SUGGESTS)
def test_name_suggests_country(country, name):
    assert country in guess_countries(name)


@pytest.mark.parametrize(("country", "name"), ONLY)
def test_distinctive_name_suggests_one_country(country, name):
    assert guess_countries(name) == [country]


@pytest.mark.parametrize("name", GIVEN_NAME_ONLY)
def test_given_name_alone_suggests_nothing(name):
    assert guess_countries(name) == []


@pytest.mark.parametrize("name", ["Ian", "Xq Zzz", ""])
def test_unknown_names_suggest_nothing(name):
    assert guess_countries(name) == []


def test_results_are_alphabetical():
    for _, name in SUGGESTS:
        countries = guess_countries(name)
        assert countries == sorted(countries)


def test_case_sets_are_alphabetical():
    assert SUGGESTS == sorted(SUGGESTS)
    assert ONLY == sorted(ONLY)
    assert GIVEN_NAME_ONLY == sorted(GIVEN_NAME_ONLY)


def test_name_model_learns_every_country_from_passports():
    people = [
        ("Joao Silva", ["Brazil"]),
        ("Joao Pereira", ["Brazil"]),
        ("Pedro Silva", ["Brazil"]),
        ("Pedro Pereira", ["Portugal"]),
        ("Pedro Silva", ["Brazil"]),
        ("Joao Silva", ["Malta"]),  # second passport: the name still points to Brazil
    ]
    model = NameModel(people)
    assert model.guess("Joao Silva", ["Malta"]) == ["Brazil"]
    assert model.guess("Anna Unique", ["Italy"]) == []  # a single occurrence is not enough
    assert "Brazil" in guess_all("Joao Silva", ["Malta"], model)
    assert "Brazil" not in guess_all("Joao Silva", ["Brazil"], model)
