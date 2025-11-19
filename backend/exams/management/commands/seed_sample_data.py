from django.core.management.base import BaseCommand

from exams.models import Option, Question, Test, VerbEntry


A1_QUESTIONS = [
    ("Jeg ___ kaffe hver morgen.", [("drikker", True), ("drikke", False), ("drikk", False)]),
    ("Hvor mange __ du?", [("år er", True), ("år har", False), ("år går", False)]),
    ("Vi ___ på kino i kveld.", [("skal", True), ("skal til", False), ("går", False)]),
    ("Hun bor ___ Oslo.", [("i", True), ("på", False), ("til", False)]),
    ("Velg hilsenen som betyr 'hello'.", [("Hei", True), ("Ha det", False), ("Takk", False)]),
    ("Han ___ norsk hver dag.", [("lærer", True), ("leste", False), ("lært", False)]),
    ("Jeg heter Anna. ___ heter du?", [("Hva", False), ("Hvordan", False), ("Hva", False)]),
    ("Velg riktig artikkel: ___ stol", [("en", True), ("ei", False), ("et", False)]),
    ("Hvilket ord passer? 'Jeg liker ___ blå jakken.'", [("den", True), ("det", False), ("de", False)]),
    ("___ går det?", [("Hvordan", True), ("Hvor", False), ("Når", False)]),
]

A2_QUESTIONS = [
    ("Han er syk, så han ___ hjemme i dag.", [("blir", True), ("ble", False), ("bli", False)]),
    ("Vi har ikke tid, ___ vi må gå nå.", [("så", True), ("fordi", False), ("men", False)]),
    ("Boken ligger ___ bordet.", [("på", True), ("i", False), ("til", False)]),
    ("Jeg har bodd her ___ to år.", [("i", True), ("på", False), ("om", False)]),
    ("Hvilket verb passer? 'De ___ å reise til Bergen.'", [("planlegger", True), ("planla", False), ("planlagt", False)]),
    ("Du må ___ mer norsk for å bli bedre.", [("øve", True), ("øv", False), ("øvet", False)]),
    ("Hun pleier ___ ta bussen.", [("å", True), ("og", False), ("til", False)]),
    ("Hvilken form er riktig? 'Et ___ hus'", [("stort", True), ("stor", False), ("store", False)]),
    ("Setningen: 'Jeg har spist middag' er i ___", [("presens perfektum", True), ("preteritum", False), ("futurum", False)]),
    ("Velg riktig alternativ: 'Kan du hjelpe meg, ___?'", [("vær så snill", True), ("vær så god", False), ("takk", False)]),
]

B1_QUESTIONS = [
    ("Hvis det ___ sol i morgen, drar vi på tur.", [("blir", True), ("ble", False), ("blitt", False)]),
    ("Jeg ___ ikke hvorfor han ikke kom.", [("skjønner", True), ("skjønte", False), ("skjønt", False)]),
    ("Hun sa at hun ___ komme litt senere.", [("ville", True), ("skal", False), ("har", False)]),
    ("De ___ ferdig med prosjektet før tidsfristen.", [("ble", False), ("blei", False), ("ble", False)]),
    ("Setningen 'Jeg skulle ønske jeg hadde mer tid' uttrykker ___", [("et ønske", True), ("et tilbud", False), ("en påstand", False)]),
    ("Hvilket ord passer? 'Han tok ansvar ___ å rydde opp.'", [("for", True), ("å", False), ("til", False)]),
    ("Hva betyr 'å stå på som vanlig'?", [("jobbe hardt", True), ("slappe av", False), ("gå hjem", False)]),
    ("Velg riktig ordstilling: ' ___ jeg reiste til Norge, lærte jeg litt språk.'", [("Før", True), ("Når", False), ("Da", False)]),
    ("'Han er kjent for å være punktlig' betyr ___", [("alltid presis", True), ("alltid sen", False), ("aldri presis", False)]),
    ("Velg riktig preposisjon: 'Vi er stolte ___ dere.'", [("av", True), ("på", False), ("med", False)]),
]

B2_QUESTIONS = [
    ("Han opptrådte ___ en erfaren taler.", [("som", True), ("for", False), ("til", False)]),
    ("'Selv om det regner, drar vi' uttrykker ___", [("motsetning", True), ("årsak", False), ("konsekvens", False)]),
    ("Hvilket ord passer? 'Det er ingen tvil ___ at han har rett.'", [("om", True), ("på", False), ("for", False)]),
    ("'Å sette noe på spissen' betyr ___", [("å overdrive for å tydeliggjøre", True), ("å legge det bort", False), ("å avslutte", False)]),
    ("Hva er mest naturlig? 'Han slo ___ de andre forslagene.'", [("ned", False), ("fast", True), ("på", False)]),
    ("Hvilken omskriving av passiv er riktig? 'Boken ble skrevet av henne.'", [("Hun skrev boken.", True), ("Hun skriver boken.", False), ("Hun ble skrevet boken.", False)]),
    ("Velg mest idiomatiske: 'Det er på høy tid ___ vi starter.'", [("at", True), ("om", False), ("hvis", False)]),
    ("Hvilket bindeord passer best? 'Han kom ikke, ___ han var invitert.'", [("selv om", True), ("fordi", False), ("mens", False)]),
    ("Hva betyr 'å ha is i magen'?", [("å være tålmodig", True), ("å være sint", False), ("å gi opp", False)]),
    ("'Å legge alle kortene på bordet' betyr ___", [("å være helt ærlig", True), ("å gi opp", False), ("å lure noen", False)]),
]


def create_test_with_questions(slug: str, title: str, description: str, level: str, question_bank: list[tuple[str, list[tuple[str, bool]]]]) -> None:
    test, created = Test.objects.get_or_create(
        slug=slug,
        defaults={
            "title": title,
            "description": description,
            "level": level,
            "estimated_minutes": 12,
            "is_published": True,
            "is_restricted": False,
        },
    )
    if not created:
        return

    for order, (text, options) in enumerate(question_bank, start=1):
        question = Question.objects.create(
            test=test,
            text=text,
            question_type=Question.QuestionType.SINGLE_CHOICE,
            order=order,
        )
        for opt_order, (opt_text, is_correct) in enumerate(options, start=1):
            Option.objects.create(
                question=question,
                text=opt_text,
                is_correct=is_correct,
                order=opt_order,
            )


VERBS_BY_STREAM = {
    Test.Stream.BOKMAAL: [
        {
            "verb": "å være",
            "infinitive": "å være",
            "present": "er",
            "past": "var",
            "perfect": "har vært",
            "examples": "Jeg er klar.\nVi har vært i Trondheim.",
            "tags": ["core", "irregular"],
        },
        {
            "verb": "å gjøre",
            "infinitive": "å gjøre",
            "present": "gjør",
            "past": "gjorde",
            "perfect": "har gjort",
            "examples": "Hva gjør du i kveld?\nHun har gjort leksene sine.",
            "tags": ["action"],
        },
        {
            "verb": "å reise",
            "infinitive": "å reise",
            "present": "reiser",
            "past": "reiste",
            "perfect": "har reist",
            "examples": "De reiser til Bergen hver sommer.",
            "tags": ["travel"],
        },
        {
            "verb": "å skrive",
            "infinitive": "å skrive",
            "present": "skriver",
            "past": "skrev",
            "perfect": "har skrevet",
            "examples": "Han skriver en rapport.\nVi har skrevet mange e-poster i dag.",
            "tags": ["study"],
        },
    ],
    Test.Stream.NYNORSK: [
        {
            "verb": "å vere",
            "infinitive": "å vere",
            "present": "er",
            "past": "var",
            "perfect": "har vore",
            "examples": "Me er klare no.\nDei har vore i Ålesund.",
            "tags": ["core", "irregular"],
        },
        {
            "verb": "å bu",
            "infinitive": "å bu",
            "present": "bur",
            "past": "budde",
            "perfect": "har budd",
            "examples": "Eg bur i Volda.\nVi har budd her i tre år.",
            "tags": ["daily"],
        },
        {
            "verb": "å lære",
            "infinitive": "å lære",
            "present": "lærer",
            "past": "lærte",
            "perfect": "har lært",
            "examples": "Ho lærer nynorsk kvar dag.",
            "tags": ["study"],
        },
        {
            "verb": "å sjå",
            "infinitive": "å sjå",
            "present": "ser",
            "past": "såg",
            "perfect": "har sett",
            "examples": "Vi ser på fjella.\nHar du sett den nye filmen?",
            "tags": ["irregular"],
        },
    ],
    Test.Stream.ENGLISH: [
        {
            "verb": "to study",
            "infinitive": "to study",
            "present": "study / studies",
            "past": "studied",
            "perfect": "have studied",
            "examples": "I study Norwegian after work.\nShe has studied Bokmål for two years.",
            "tags": ["daily"],
        },
        {
            "verb": "to travel",
            "infinitive": "to travel",
            "present": "travel / travels",
            "past": "traveled",
            "perfect": "have traveled",
            "examples": "We travel to Norway every winter.",
            "tags": ["travel"],
        },
        {
            "verb": "to teach",
            "infinitive": "to teach",
            "present": "teach / teaches",
            "past": "taught",
            "perfect": "have taught",
            "examples": "They teach Norwegian online.\nHe has taught for ten years.",
            "tags": ["work"],
        },
        {
            "verb": "to practice",
            "infinitive": "to practice",
            "present": "practice / practices",
            "past": "practiced",
            "perfect": "have practiced",
            "examples": "Practice speaking every day for better progress.",
            "tags": ["study"],
        },
    ],
}


class Command(BaseCommand):
    help = "Seed curated Norwegian tests with real content (A1-B2) and verb tables."

    def handle(self, *args, **options):
        self.stdout.write("Clearing previous tests and verbs...")
        Test.objects.all().delete()
        VerbEntry.objects.all().delete()

        level_data = [
            (Test.Level.A1, A1_QUESTIONS),
            (Test.Level.A2, A2_QUESTIONS),
            (Test.Level.B1, B1_QUESTIONS),
            (Test.Level.B2, B2_QUESTIONS),
        ]

        tests_per_level = 10
        created_tests = 0
        for level, bank in level_data:
            for idx in range(1, tests_per_level + 1):
                slug = f"{level.lower()}-praksis-{idx:02d}"
                title = f"{level} praksis {idx}"
                description = f"Reelle oppgaver for nivå {level}"
                create_test_with_questions(slug, title, description, level, bank)
                created_tests += 1

        created_verbs = 0
        for stream, verb_items in VERBS_BY_STREAM.items():
            for payload in verb_items:
                VerbEntry.objects.create(stream=stream, **payload)
                created_verbs += 1

        self.stdout.write(
            self.style.SUCCESS(f"Seed complete. Added {created_tests} tests and {created_verbs} verbs.")
        )
