"""Naming patterns per country, used by names.py for name-based country hints.

Each profile can carry:
- `letters`: characters that (almost) only this language uses; one is enough.
- `strong`: surname endings that are enough on their own (-shvili, -oğlu, -enko…).
- `given` + `surnames` / `weak`: common given names and surnames, or weaker surname
  endings; a name needs a given-name match AND a surname match.
- `particles`: name particles that mark the country (van, ter…).

All lists are ASCII-folded and lower case, the same way `util.normalize_name` folds
names. A profile can point to several countries (`countries`) when the pattern is
shared. Profiles, countries and word lists are kept in alphabetical order. Profiles, countries and word lists are kept in alphabetical order. Country names use the register's spelling ("Russian Federation", …).
"""

from __future__ import annotations

from dataclasses import dataclass, field


def _words(text: str) -> frozenset[str]:
    return frozenset(text.split())


@dataclass(frozen=True)
class Profile:
    countries: tuple[str, ...]
    letters: str = ""
    strong: tuple[str, ...] = ()
    weak: tuple[str, ...] = ()
    given: frozenset[str] = field(default_factory=frozenset)
    surnames: frozenset[str] = field(default_factory=frozenset)
    particles: frozenset[str] = field(default_factory=frozenset)
    # surnames distinctive enough on their own (Borg → Malta, Nguyen → Viet Nam)
    distinct: frozenset[str] = field(default_factory=frozenset)


MK = "Macedonia, the Former Yugoslav Republic of"
EX_USSR = ("Belarus", "Kazakhstan", "Russian Federation", "Ukraine")



PROFILES: list[Profile] = [
    Profile(
        countries=("Aland Islands", "Sweden"),
        letters="Åå",
        strong=("sson",),
        given=_words(
            """alexander anders andreas anna annika birgitta bjorn camilla carl christer daniel elin emma erik eva
            fredrik goran gustav hans helena henrik ingrid jakob joakim johan johanna jonas karin kent kristina
            lars linnea linus magnus maja malin marcus mats mikael niklas olof oskar per peter robert sara
            sebastian sofia stefan ulf ulrika viktor"""
        ),
        surnames=_words(
            """andersson berg eriksson gustafsson hansson jakobsson johansson karlsson larsson lindberg lindqvist
            nilsson olsson persson svensson"""
        ),
    ),
    Profile(
        countries=("Aland Islands", "Finland"),
        strong=("inen", "lainen", "nen"),
        given=_words("antti janne johanna juha jukka kari mikko pekka sanna timo tuomas ville"),
    ),
    Profile(
        countries=("Albania",),
        weak=("aj", "ku", "ri"),
        given=_words(
            """adrian agron alban albert altin andi anisa arben arber ardit arian ariel arjan arlind armand arta
            artan astrit besnik bledar blendi blerina brikena denisa dorian dritan edmond eduart elira elona
            elvis endrit enea enkelejda erald erion ermal ermira ervin esmeralda fatmir fatos florian genc
            gentian gezim ilir klajdi klea kristi lorenc mario marsel migena olsi orges redi rezart rudina sokol
            taulant xhoni"""
        ),
        surnames=_words(
            """alia allaj bajrami bala balla basha berisha bushati cani cela dedja demiri dervishi duka gashi gjini
            gjoka haxhiu hoxha hysa kapllani kastrati kola krasniqi leka lika marku mema muca nikolli prifti
            rama sadiku shehu shkurti tafa xhafa zeneli"""
        ),
    ),
    Profile(
        countries=("Argentina", "Chile", "Colombia", "Costa Rica", "Mexico", "Peru", "Spain", "Uruguay", "Venezuela"),
        letters="Ññ",
        weak=("ado", "ero", "es", "ez", "ia"),
        given=_words(
            """adrian alberto alejandra alejandro alfonso alvaro ana andrea andres angel antonio armando arturo
            beatriz camila carlos carmen carolina cesar claudia cristian daniel daniela david diego eduardo
            elena emilio enrique ernesto esteban felipe fernando francisco gabriel gabriela gonzalo guillermo
            gustavo hector hugo ignacio isabel ivan jaime javier joaquin jorge jose juan julia julio laura
            leonardo lorenzo lucia luis manuel marcos maria mariana mario marta martin mateo mauricio miguel
            monica natalia nicolas oscar pablo patricia paula pedro pilar rafael ramon raquel raul ricardo
            roberto rocio rodrigo rosa ruben salvador santiago sergio silvia sofia tomas valentina veronica
            victor"""
        ),
        surnames=_words(
            """aguilar alonso alvarez blanco calvo cano castillo castro chavez cortes cruz delgado diaz dominguez
            fernandez flores garcia garrido gil gimenez gomez gonzalez gutierrez hernandez herrera ibanez
            iglesias jimenez leon lopez lozano marin marquez martinez medina mendoza molina mora morales moreno
            munoz navarro nunez ortega ortiz pascual perez prieto ramirez ramos reyes rivera rodriguez rojas
            romero rubio ruiz salazar sanchez santana serrano suarez torres vargas vasquez vazquez vega vidal"""
        ),
    ),
    Profile(
        countries=("Armenia",),
        strong=("ian", "unts", "yan", "yants"),
        given=_words(
            """anahit aram arman armen armine arsen artur ashot astghik avetik davit edgar gagik garik gayane
            gevorg gor grigor hakob hasmik hayk hovhannes karen levon lilit lusine mariam mher mkrtich nare
            narek samvel sargis sergey shushan suren tatevik tigran vahagn vahe vardan vazgen"""
        ),
    ),
    Profile(
        countries=("Australia", "Canada", "Gibraltar", "Ireland", "Isle of Man", "New Zealand", "United Kingdom", "United States"),
        weak=("ford", "ley", "son", "ton", "worth"),
        given=_words(
            """aaron adam alan alex alexander alice amy andrew andy anthony ben benjamin brendan brian cameron
            charles charlotte chloe chris christopher claire colin craig daniel david dean derek edward
            elizabeth emily emma gary graham greg hannah harry helen ian jack jake james jane jason jeffrey
            jennifer jessica joanne joe john jonathan jordan joshua karen kate katherine keith kenneth kevin
            laura liam lisa louise lucy luke mark mary matt matthew michael michelle natalie nathan neil nick
            nicola oliver patrick paul peter philip rachel rebecca richard rob robert ross ryan sam samantha
            sarah scott sean shane simon sophie stephen steven stuart thomas tim tony victoria william"""
        ),
        surnames=_words(
            """allen baker bell bennett brown campbell carter clark clarke collins cook cooper davies davis edwards
            ellis evans fisher foster graham gray green hall harris harrison hill holmes hughes hunt jackson
            james johnson jones kelly king knight lee lewis marshall martin mason miller mitchell moore morgan
            morris murray owen parker phillips price richards richardson roberts robinson rogers russell scott
            shaw simpson smith stevens stewart taylor thomas thompson turner walker ward watson webb wells white
            williams wilson wood wright young"""
        ),
    ),
    Profile(
        countries=("Austria", "Germany", "Switzerland"),
        letters="ß",
        strong=("berger", "hofer", "huber", "mann"),
        given=_words(
            """alexander andreas anja anke bernd birgit christian christina christoph claudia daniel dieter dirk
            felix florian frank hans heike heinz helmut holger jan jens jonas julia jurgen kai karl katharina
            kerstin klaus lars laura lena lukas manfred markus martin matthias max maximilian michael moritz
            nicole niklas norbert oliver patrick peter petra philipp rainer ralf sabine sebastian silke simon
            stefan stefanie susanne sven thomas thorsten tim tobias ursula uwe werner wolfgang"""
        ),
        surnames=_words(
            """bauer becker braun fischer hartmann hoffmann hofmann kaiser klein koch koehler krause krueger lange
            lehmann maier meyer mueller muller neumann richter schmidt schneider scholz schroeder schulz schwarz
            wagner walter weber werner wolf zimmermann"""
        ),
    ),
    Profile(
        countries=("Azerbaijan",),
        strong=("bayli", "beyli", "zada", "zade"),
        weak=("ev", "eva", "li", "ov", "ova"),
        given=_words("anar aysel elchin elnur elvin farid gunel ilgar leyla orkhan ramil rashad rauf tural vugar"),
    ),
    Profile(
        countries=("Bahrain", "Jordan", "Lebanon", "Morocco", "United Arab Emirates"),
        given=_words(
            """abdallah adel ahmad ahmed ali amin anas aya bassam bilal dina elie fadi fatima fouad georges hadi
            hala hamza hani hassan hiba hisham hussein ibrahim imad issa jad jamal joseph kamal karim khaled
            lama layla lina maher mahmoud majed mariam marwan maya mazen michel mohammad mohammed mona muhammad
            mustafa nabil nada nader nasser noor nour omar osama rabih rami rana rania reem riad salim salma
            sami samir sara tamer tarek wael walid yasmin yasser yousef youssef zaid ziad"""
        ),
        surnames=_words(
            """abdallah ahmad ali assaf awad aziz daher farah haddad haidar hamdan hassan hijazi issa jaber kassem
            khalil khoury mansour nassar nasser rizk saad said saleh salem sleiman tannous youssef"""
        ),
        particles=_words("abu al bin el ibn"),
    ),
    Profile(
        countries=("Bangladesh", "India", "Nepal", "Pakistan", "Sri Lanka"),
        given=_words(
            """aarav aarti abhishek aditya aisha ajay akash amar amit anand ananya anil anjali arjun arun ashish
            ashok deepak dinesh divya gaurav harish karan kavita kiran lakshmi manish meera mohan naveen neha
            nikhil nisha nitin pankaj pooja prakash pranav preeti priya radha rahul rajesh rajiv rakesh ramesh
            ravi riya rohit sachin sandeep sanjay santosh shiv sunil sunita suresh swati vijay vikram vivek"""
        ),
        surnames=_words(
            """agrawal bhatt bose chatterjee das desai dutta ghosh iyengar jain khanna krishnan mishra mukherjee
            pandey pillai rao saxena sinha srivastava tiwari trivedi yadav"""
        ),
        distinct=_words(
            """agarwal chopra gupta iyer joshi kapoor kumar mehta nair patel reddy shah sharma singh verma"""
        ),
    ),
    Profile(
        countries=("Belarus", "Bulgaria", "Kazakhstan", MK, "Russian Federation", "Ukraine"),
        letters="ЪЫЭъыэ",
        strong=("ev", "eva", "evich", "evna", "ov", "ova", "ovich", "ovna", "skaya", "skiy", "tsev", "tseva", "yov", "yova"),
    ),
    Profile(
        countries=("Belarus",),
        strong=("enka", "ionak", "onak"),
        given=_words(
            """alena aliaksandr aliaksandra aliaksei andrei artsiom darya dzianis dzmitry hanna ihar iryna
            kanstantsin katsiaryna maksim maryia mikalai mikhail nastassia pavel raman siarhei tatsiana
            uladzimir uladzislau viktar volha yauhen yuliya yury"""
        ),
    ),
    Profile(
        countries=("Belgium", "France", "Switzerland"),
        weak=("aux", "eau", "elle", "ier"),
        given=_words(
            """alain amelie antoine arnaud aurelie benoit bruno camille catherine celine chloe christophe claude
            cyril damien didier eric fabrice francois frederic gerard gilles guillaume herve isabelle jacques
            jean jerome julien juliette laurent lea loic luc manon marc marie mathieu mathilde maxime michel
            nathalie nicolas olivier pascal patrick philippe pierre raphael remi sandrine sebastien sophie
            stephane sylvain thierry valerie vincent yann"""
        ),
        surnames=_words(
            """andre bernard blanc bonnet chevalier david dubois dupont durand fontaine fournier gauthier girard
            guerin lambert laurent lefebvre lefevre legrand leroy martin mercier moreau morel muller petit
            richard robert roux simon thomas vincent"""
        ),
    ),
    Profile(
        countries=("Belgium", "Curacao", "Netherlands", "South Africa"),
        weak=("dijk", "ema", "huis", "ink", "stra"),
        given=_words(
            """annemiek anouk arjen bart bas bob bram daan dennis dirk edwin erik esther eva femke frank hans henk
            ilse inge iris jan jasper jeroen jolanda joost joris jos karin kees koen lars lisa lotte luuk
            maarten marco marieke mark marloes martijn michiel monique niels nienke petra pieter pim remco rick
            rob ronald ruud sander sanne saskia sjoerd stefan thijs tim tom vincent willem wim wouter"""
        ),
        surnames=_words(
            """bakker berg boer bos bosch brouwer dam dekker dijk dijkstra graaf groot hendriks jansen janssen jong
            kok kuipers meijer mulder peters prins schouten smit smits verhoeven vermeulen visser vos vries
            willems"""
        ),
        particles=_words("den der ten ter van vander"),
    ),
    Profile(
        countries=("Bosnia and Herzegovina", "Croatia", "Montenegro", "Serbia", "Serbia and Montenegro", "Slovenia"),
        letters="ĆćĐđ",
        strong=("cic", "evic", "jic", "ovic", "vic"),
        weak=("ic",),
        given=_words(
            """aleksandar aleksandra ana ante antonio biljana bojan boris borna damir danijel davor dejan domagoj
            dragan dragana dusan filip franjo goran hrvoje igor ivan ivana ivica jelena josip jovan jovana karlo
            katarina kresimir luka maja marija marko matej mateo milan milica milos mirjana miroslav mladen
            nemanja nevena nikola petar predrag sasa snezana srdjan stefan tamara tomislav uros vladimir zarko
            zeljko zoran"""
        ),
        surnames=_words(
            """djordjevic ilic jovanovic kovacevic markovic milosevic nikolic pavlovic petrovic popovic savic
            stankovic stojanovic todorovic zivkovic"""
        ),
    ),
    Profile(
        countries=("Brazil", "Portugal"),
        letters="ÃÕãõ",
        strong=("eira", "inho", "oes"),
        given=_words(
            """adriana afonso alexandre aline amanda ana andre andreia antonio beatriz bernardo bruna bruno camila
            carla carlos carolina catarina claudia daniel daniela diego diogo duarte eduardo fabiana fabio
            felipe fernanda fernando filipa filipe francisco gabriel gabriela goncalo guilherme gustavo henrique
            hugo igor ines isabela joana joao joaquim jorge jose juliana larissa leandro leonardo leticia luana
            lucas luciana luis luiz manuel marcelo marcia marcos margarida mariana mateus matheus miguel nuno
            patricia paulo pedro rafael renata renato ricardo rita rodrigo rui sandra sara sergio sofia tatiana
            teresa thiago tiago tomas vanessa vasco vinicius vitor"""
        ),
        surnames=_words(
            """almeida alves antunes araujo barbosa barros batista borges cardoso carvalho castro correia costa
            cunha dias fernandes ferreira fonseca freitas gomes lima lopes loureiro machado magalhaes marques
            martins matos melo mendes monteiro moreira moura nascimento neves nunes oliveira pereira pinheiro
            pinto ramos reis ribeiro rocha rodrigues sa santos silva soares sousa souza tavares teixeira vieira"""
        ),
    ),
    Profile(
        countries=("Bulgaria",),
        weak=("ev", "eva", "ov", "ova", "ska", "ski"),
        given=_words(
            """aleksandar angel ani anton asen atanas boris boryana boyan daniel desislava diana dimitar elena
            elitsa emil evgeni filip galina georgi gergana hristo iliya iva ivan ivaylo kalina kaloyan kamen
            kiril konstantin krasimir lyubomir maria mariya martin maya milen mitko momchil nadezhda neli nikola
            nikolay ognyan pavel petar petya plamen radoslav radostina rumen silviya simeon stanislav stanislava
            stefan stoyan svetoslav teodora todor tsvetan tsvetelina valentin vasil veselin yana yordan zdravko"""
        ),
        surnames=_words(
            """angelov atanasov dimitrov georgiev hristov ivanov kolev marinov nikolov petkov petrov popov stoyanov
            todorov vasilev yordanov"""
        ),
    ),
    Profile(
        countries=("Cambodia", "Thailand"),
        strong=("chai", "porn", "wongse"),
        given=_words("anan dara prasert somchai somsak sophea supachai vanna"),
    ),
    Profile(
        countries=("China", "Hong Kong", "Malaysia", "Singapore", "Taiwan, Province of China"),
        surnames=_words(
            """bai cui dai ding du fan fang fu gong gu hao hou jia jiang jin kong lei liao lu mao meng mo ning ou
            qian qin qiu ren shao shen shi song su tian wan wei wen xia xiang xiong yan yao ye yi yin yu yue
            zhan zhong"""
        ),
        distinct=_words(
            """cai cao chan chen cheng cheung deng feng gao guo han he hu huang lau li liang lin liu luo ma ng pan
            peng sun tan tang tsang wang wong wu xiao xie xu yang yuan zeng zhang zhao zheng zhou zhu"""
        ),
    ),
    Profile(
        countries=("Cyprus", "Greece"),
        strong=("akis", "akos", "iadis", "ides", "idis", "idou", "iou", "oglou", "opoulos", "opoulou"),
        weak=("as", "is", "os", "ou"),
        given=_words(
            """achilleas alexandra alexandros anastasios andreas andrie angelos anna antonios antonis apostolos
            athanasios athina charalambos christina christodoulos christos chrystalla constantia costas demetris
            despina dimitra dimitrios dimitris efstathios eirini eleftheria eleni emmanouil evangelia evangelos
            evi fotios fotis georgia georgios giorgos grigoris ilias ioanna ioannis kalliopi katerina
            konstantina konstantinos kostas kyriaki kyriakos lambros lefteris leonidas loizos magdalini manolis
            maria marina marios michael michalis nektarios neophytos nicolas nicoletta niki nikolaos nikos olga
            panagiota panagiotis panayiotis panos paraskevi pavlos petros savvas sofia sophia sotiris spyros
            stavros stefanos stelios stella thanos theodoros vasileios vasiliki vasilis yannis yiannis"""
        ),
        surnames=_words(
            """alexiou antoniou christodoulou constantinou demetriou dimitriou georgiadis georgiou ioannou
            karagiannis konstantinidis kyriacou loizou makris michael nicolaou nikolaou oikonomou panayiotou
            papadopoulos pappas pavlou petrou savva stylianou theodorou vlachos"""
        ),
    ),
    Profile(
        countries=("Czech Republic", "Slovakia"),
        letters="ĚěŘřŮů",
        weak=("ak", "ek", "ik", "ova", "y"),
        given=_words(
            """adam alena ales antonin bohumil david dominik eva filip frantisek hana ivan ivana jakub jan jana
            jaroslav jiri jitka josef karel katerina ladislav lenka libor lucie lukas marek marketa martin
            martina michaela michal milan miroslav monika ondrej pavel pavla petr petra radek roman stanislav
            tereza tomas vaclav veronika vojtech zdenek zuzana"""
        ),
        surnames=_words(
            """cerny dvorak horak kral kucera mares novak novotny pokorny prochazka ruzicka svoboda vesely"""
        ),
    ),
    Profile(
        countries=("Denmark", "Norway"),
        letters="ÆØæø",
        strong=("sen",),
        given=_words(
            """anders anne arne astrid birgitte bjorn camilla charlotte christian eirik espen even frederik geir
            gunnar hakon hanne havard henning henrik hilde ingrid jakob jan jens jesper jorgen kari kasper kim
            kirsten kjetil knut kristian lars lene line louise mads magnus maria marit mette mikkel morten
            nikolaj ola ole oyvind peter pia poul randi rasmus rune silje sindre solveig soren stian susanne
            terje thomas tone torben trond vidar"""
        ),
        surnames=_words(
            """andersen berg christensen dahl hagen hansen haugen jensen johansen johnsen karlsen larsen lie moen
            nielsen nilsen olsen pedersen petersen rasmussen solberg sorensen strand"""
        ),
    ),
    Profile(
        countries=("Estonia",),
        letters="Õõ",
        weak=("berg", "maa", "mae", "pere", "saar", "son"),
        given=_words("andres jaan juri kadri kristiina liis mart priit tarmo tonu toomas triin"),
    ),
    Profile(
        countries=("Georgia",),
        strong=("adze", "dze", "eli", "idze", "shvili"),
        weak=("ani", "ava", "ia", "uri"),
        given=_words(
            """akaki aleksandre ana archil bakuri beka besik dachi david davit demetre eka elene gela gia giga
            giorgi gocha goga guram ilia irakli kakha ketevan khatia khvicha koba lado lali lasha levan levani
            lika luka maia mamuka manana mariam merab nana natia nika nikoloz nino otar revaz salome sandro
            shota sophio tamar tamta tea temur tengiz tornike vakhtang zaza zurab"""
        ),
    ),
    Profile(
        countries=("Ghana", "Nigeria"),
        given=_words(
            """abena abiodun adaeze adebayo adewale ama amaka ayodele babatunde chiamaka chibuike chidi chinedu
            chinonso chioma chukwudi chukwuemeka emeka folake ifeanyi ikechukwu kayode kehinde kofi kwabena
            kwame ngozi nkechi nnamdi obinna olumide oluwakemi oluwaseun segun titilayo tobi tunde uche yetunde"""
        ),
        surnames=_words(
            """abubakar adeleke adewumi afolabi ajayi akinola bello danjuma eze ibrahim ojo okeke okoro olaniyan
            onyeka oyelaran uzor"""
        ),
        distinct=_words(
            """adebayo adeyemi asante boateng chukwu eze mensah nwankwo obi ogunleye okafor okeke okonkwo olawale
            osei owusu"""
        ),
    ),
    Profile(
        countries=("Hungary",),
        letters="ŐőŰű",
        strong=("falvi", "hazi", "szky"),
        given=_words(
            """agnes attila balazs csaba eszter gabor gergely istvan katalin laszlo peter tamas zoltan zsofia zsolt"""
        ),
        surnames=_words("balogh farkas horvath juhasz kiss kovacs molnar nagy nemeth papp szabo takacs toth varga"),
    ),
    Profile(
        countries=("Indonesia", "Malaysia", "Singapore"),
        given=_words("agus ahmad budi dewi mohd muhammad nur putri siti"),
        surnames=_words("abdullah ahmad hamid hassan ibrahim ismail rahman razak yusof zainal"),
        particles=_words("bin binti bte"),
    ),
    Profile(
        countries=("Iran, Islamic Republic of",),
        strong=("far", "nejad", "nezhad", "pour", "zadeh"),
        given=_words("ali amir babak behnam dariush hamid hossein majid maryam mehdi mohammad reza saeed zahra"),
    ),
    Profile(
        countries=("Ireland",),
        given=_words("aoife cian ciaran conor declan eoin niall niamh patrick sean siobhan"),
        surnames=_words(
            """byrne doherty doyle gallagher kelly kennedy lynch mccarthy murphy obrien oconnor ryan walsh"""
        ),
        particles=_words("mac mc"),
    ),
    Profile(
        countries=("Israel",),
        given=_words(
            """adi alon amir amit ariel asaf avi avraham ayelet barak boaz dana daniel david dor dov einat elad eli
            eran erez eyal gal guy haim hila ido ilan itai itamar keren limor lior maya meir michal moshe nadav
            nir noa ofer omer oren ori orly rachel ran ronen roy ruth sarit shai shimon shira tal talia tamar
            uri yaakov yael yair yaron yehuda yitzhak yoav yonatan yossi"""
        ),
        surnames=_words(
            """biton bitton david elbaz goldberg greenberg harel hazan katz klein malka mor sasson shapira shapiro
            weiss"""
        ),
        distinct=_words("avraham azoulay biton cohen dahan friedman katz kohen levi levy mizrahi ohana peretz"),
    ),
    Profile(
        countries=("Italy", "Switzerland"),
        strong=("acci", "elli", "ello", "etti", "ini", "otti", "ozzi", "ucci"),
        given=_words(
            """alberto alessandra alessandro alessio andrea angelo antonio chiara claudio dario davide elena
            emanuele enrico fabio federica federico filippo francesca francesco gabriele gianluca giorgia
            giovanni giulia giuseppe ilaria lorenzo luca manuel marco martina massimo matteo mattia maurizio
            michele nicola paola paolo pietro riccardo roberta roberto salvatore sara silvia simone stefano
            tommaso valentina vincenzo"""
        ),
        surnames=_words(
            """barbieri benedetti bianchi bruno caruso colombo conti costa esposito fabbri ferrari fontana galli
            gallo gentile giordano greco leone lombardi longo luca mancini mariani marino martini moretti
            pellegrini ricci rinaldi romano rossi russo santoro serra villa"""
        ),
    ),
    Profile(
        countries=("Japan",),
        distinct=_words("ito kato kobayashi nakamura sato suzuki takahashi tanaka watanabe yamada yamamoto yoshida"),
    ),
    Profile(
        countries=("Kazakhstan", "Kyrgyzstan", "Uzbekistan"),
        strong=("baev", "baeva", "bekov", "bekova", "kyzy", "uly"),
        given=_words(
            """abylai adilet aibek aida aidar aidos aigerim aliya almas arman askar assel asset azamat bakhyt
            baurzhan dana daniyar daulet dauren dinara erlan gulnara gulnur kairat kamila kanat madina marat
            medet nurlan nursultan olzhas ruslan rustem saken saule serik talgat timur yerbol yerlan zhandos
            zhanna"""
        ),
    ),
    Profile(
        countries=("Korea, Republic of",),
        surnames=_words("bae baek cha chung han hong hwang jeon ko kwon moon nam oh ryu seo song yang yoo"),
        distinct=_words("cho choi jang jeong jung kang kim lee lim park shin yoon"),
    ),
    Profile(
        countries=("Latvia",),
        letters="ĀāĒēĢģĪīĶķĻļŅņŪū",
        weak=("a", "e", "ins", "s"),
        given=_words(
            """agnese aigars aivars aleksandrs andris anna armands arturs dace dainis davis diana edgars evita
            gatis gints girts guntis ieva ilze inese inga ivars janis juris kaspars kristaps kristine laura liga
            linda maris martins normunds raimonds rihards roberts sanita santa toms uldis valdis zane"""
        ),
        surnames=_words("balodis berzins jansons kalnins krumins liepins ozolins ozols petersons vitols zarins"),
    ),
    Profile(
        countries=("Lithuania",),
        letters="ĖėĮįŲų",
        strong=("aite", "auskas", "auskiene", "enas", "iene", "unas", "ute"),
        weak=("as", "is", "us"),
        given=_words(
            """agne aiste aleksandras andrius antanas arnas asta aurimas darius deividas domantas donatas dovile
            edvinas egle greta ieva ignas indre jonas jurgita justas karolis kestutis kristina laura laurynas
            lina lukas mantas marius martynas migle mindaugas paulius povilas rasa rokas ruta saulius simas
            simona tadas tomas vaida vaidas vytautas zygimantas"""
        ),
    ),
    Profile(
        countries=(MK,),
        strong=("evska", "evski", "oska", "oski", "ovska", "ovski"),
        given=_words("aleksandar biljana dejan dragan goran igor marija nenad nikola zoran"),
    ),
    Profile(
        countries=("Malta",),
        surnames=_words(
            """aquilina baldacchino bartolo bezzina bonello borg briffa busuttil calleja cauchi chetcuti ciantar
            cutajar darmanin degiorgio ellul falzon formosa frendo gatt giordmaina grima mallia mamo muscat
            pisani portelli saliba sant scicluna tabone vassallo xuereb zahra"""
        ),
        distinct=_words(
            """abela agius attard azzopardi bonnici borg bugeja buttigieg camilleri caruana cassar debono farrugia
            fenech galea gauci grech micallef mifsud pace said sammut schembri spiteri vella zammit"""
        ),
    ),
    Profile(
        countries=("Moldova, Republic of", "Romania"),
        letters="ĂăȘșȚț",
        strong=("eanu", "escu", "iuc"),
        weak=("a", "u"),
        given=_words(
            """adrian alexandra alexandru alin alina ana anca andreea andrei bogdan catalin claudiu constantin
            cornel costel cristian cristina dan daniel daniela diana dorin dragos elena emil eugen florin
            gabriel george gheorghe ioana ion ionut irina iulian liviu lucian maria marian marius mihaela mihai
            mircea monica nicolae oana octavian ovidiu paul petru radu raluca razvan roxana simona sorin stefan
            valentin victor vlad"""
        ),
        surnames=_words(
            """ardeleanu constantinescu dumitru florea gheorghe ionescu matei moldovan munteanu nistor oprea popa
            popescu radu stan stoica tudor"""
        ),
    ),
    Profile(
        countries=("Pakistan",),
        distinct=_words("awan butt chaudhary chaudhry khan malik mirza qureshi siddiqui"),
    ),
    Profile(
        countries=("Philippines",),
        given=_words(
            """angelo arlene carlo charmaine christian cristina dennis ernesto imelda jayson jerome jocelyn joel
            john jomar jonathan jose joy juan kristine lorna ma maria marivic mark michael paolo raymond rodel
            romeo rosario rowena ryan"""
        ),
        surnames=_words(
            """aguilar andrada aquino bautista castillo cruz domingo flores garcia gonzales lopez mendoza navarro
            ocampo pascual ramos reyes rivera salazar santiago santos tomas torres valdez villanueva"""
        ),
        particles=_words("del dela delos"),
    ),
    Profile(
        countries=("Poland",),
        letters="ĄąĘęŁłŃńŚśŹźŻż",
        strong=("czak", "czyk", "wicz", "wska", "wski"),
        weak=("cka", "cki", "dzki", "ska", "ski"),
        given=_words(
            """adam agnieszka andrzej anna artur barbara bartosz beata dariusz dawid ewa grzegorz iwona jacek jakub
            jan janusz jaroslaw jerzy joanna justyna kamil karol katarzyna krystian krzysztof lukasz maciej
            magdalena malgorzata marcin marek mariusz marta mateusz michal monika natalia norbert paulina pawel
            piotr przemyslaw rafal robert ryszard slawomir stanislaw sylwia szymon tadeusz tomasz urszula
            wojciech zbigniew zofia"""
        ),
        surnames=_words(
            """dabrowski jankowski kaminski kowalczyk kozlowski lewandowski mazur nowak szymanski wisniewski wojcik
            wozniak zielinski"""
        ),
    ),
    Profile(
        countries=("Russian Federation",),
        given=_words(
            """aleksandr aleksei alexander alexey anastasia andrei andrey anna anton arkady artem boris danil daria
            denis dmitrii dmitry eduard ekaterina elena evgenii evgeny fedor filipp galina gennady georgy gleb
            grigory igor ilya inna irina ivan kirill konstantin kristina ksenia larisa leonid lev lyudmila
            maksim maria marina matvey maxim mikhail nadezhda natalia nikita nikolai oleg olga pavel petr polina
            roman ruslan semyon sergei sergey sofia stanislav stepan svetlana tatiana timofey vadim valentina
            valery vasily vera veronika viktor viktoria vitaly vladimir vyacheslav yaroslav yulia yuri zoya"""
        ),
        surnames=_words(
            """alekseev andreev egorov fedorov ivanov kovalev kozlov kuznetsov lebedev makarov morozov nikolaev
            novikov orlov pavlov petrov popov romanov semenov smirnov sokolov stepanov tarasov vasiliev
            vinogradov volkov yakovlev zaitsev"""
        ),
    ),
    Profile(
        countries=("Turkey",),
        letters="ĞğİıŞş",
        strong=("oglu", "ogullari"),
        weak=("dag", "demir", "dogan", "gul", "kaya", "ozden", "soy", "tas", "tekin", "turk", "yilmaz"),
        given=_words(
            """abdullah adem adnan ahmet akif alaattin ali alp alper altan arda arif aslan atakan ayhan aykut aylin
            ayse aysegul aysel aysun aytac bahar banu baris basak batuhan bayram belgin berk berkay berna besim
            betul bilal bora bulent burak burcu burhan busra can caner cansu cavit cem cemal cemil cengiz cenk
            cetin cihan coskun demet denizhan derya didem dilek dogan dogukan ebru elif emin emine emir emrah
            emre engin enver ercan erdal erdem erdogan eren ergun erhan erkan erol ersin ertan ertugrul esat
            esra fahri faruk fatih fatma ferhat fikret filiz firat fuat gamze gizem gokhan gul gulay gulsen
            gurkan hacer hakan halil haluk hamza hande harun hasan hatice havva hikmet hulya huseyin ibrahim
            ilhan ilker ilknur ipek irfan ismail kaan kadir kamil kemal kenan kerem koray kubra kursat levent
            leyla mahmut mehmet melek melih meltem mert merve mesut metin muhammed muhammet murat mustafa nazli
            necati nedim nermin nesrin nihat nur nurcan nurettin nuri oguz oguzhan okan omer onur orhan osman
            ozan ozgur ozlem pinar recep sabri sadik salih samet sami savas seda sedat selahattin selcuk
            selim selin sema semih serap serdar seref serhat serkan sevgi sevim sevket sibel sinan songul suat
            sukru suleyman sultan taner tarik tayfun tolga tugba tulay tuncay turan turgay ugur umit umut veysel
            volkan yasemin yasin yavuz yesim yigit yunus yusuf zafer zehra zeki zeynep ziya"""
        ),
        surnames=_words(
            """acar akbulut akgul akin akkaya aksoy aktas akyol aldemir alkan altin altun arslan aslan ates avci
            ayaksiz aydin aydogan ayhan baser bayram baysal bozkurt bulut cakir cakmak can celik cetin cevik
            cicek civelek coban demir demirci demirel deniz dogan dogru duman duran durmaz ekinci elmas erdem
            erdogan eren ergin erkan eroglu ersoy ertas ertugrul faki gok gokce gokhan gordag gul guler gultekin
            gumus gunay gunduz gunes gurbuz guven guzel inan isik kacar kahraman kalkan kaplan kara karabulut
            karaca karadag karadeniz karakaya karakus karatas kartal kaya kaymaz keskin kilic kilinc koc kocak
            korkmaz kose kurt kutlu mercan oral ozbek ozcan ozdemir ozden ozer ozgur ozkan ozmen ozturk polat
            sahin sakir sarac sari sayan sen senturk simsek sonmez soylu sozen tas tasdemir tekin temiz tok
            topal toprak tunc tuncer turan turk turkmen unal uysal uzun yalcin yaman yavuz yazici yigit yildirim
            yildiz yilmaz yuksel yurt yurtsever zengin"""
        ),
    ),
    Profile(
        countries=("Ukraine",),
        letters="ЄЇєїҐґ",
        strong=("chuk", "czuk", "enko", "evych", "iuk", "ivska", "ovska", "ovych", "yuk"),
        weak=("ak", "ko", "uk"),
        given=_words(
            """alina anastasiia anatolii andrii andriy artem bohdan borys daryna denys dmytro fedir halyna hanna
            hennadii hryhorii ihor illia inna iryna ivan kateryna khrystyna kostiantyn larysa liudmyla maksym
            mariia mykhailo mykola nadiia nataliia nazar oksana oleh oleksandr oleksii olena olha ostap pavlo
            petro roman ruslan serhii sofiia solomiia stanislav stepan svitlana taras tetiana vasyl viktor
            viktoriia vitalii vladyslav volodymyr yana yaroslav yevhen yuliia yurii zoriana"""
        ),
        surnames=_words(
            """bondarenko boyko kovalchuk kovalenko kravchenko lysenko melnyk moroz oliinyk pavlenko polishchuk
            rudenko savchenko shevchuk tkachenko tkachuk"""
        ),
    ),
    Profile(
        countries=("Viet Nam",),
        surnames=_words(
            """cao dinh do doan duc ha khuc lai lam luong luu mai quach ta thach thai tieu trinh truong vuong"""
        ),
        distinct=_words("bui dang duong hoang huynh ly ngo nguyen pham phan tran vo vu"),
    ),
]
