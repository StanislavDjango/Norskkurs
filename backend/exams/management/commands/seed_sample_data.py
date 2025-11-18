from django.core.management.base import BaseCommand

from exams.models import Option, Question, Test


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


class Command(BaseCommand):
    help = "Seed curated Norwegian tests with real content (A1-B2)."

    def handle(self, *args, **options):
        self.stdout.write("Clearing previous tests...")
        Test.objects.all().delete()

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

        self.stdout.write(self.style.SUCCESS(f"Seed complete. Added {created_tests} tests."))
