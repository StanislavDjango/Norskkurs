from django.core.management.base import BaseCommand

from exams.models import Option, Question, Test


SAMPLE_TESTS = [
    {
        "title": "Grunnleggende ordforråd",
        "slug": "a1-ordforrad",
        "description": "A1-nivå: velg riktig norske ord og endelser.",
        "level": Test.Level.A1,
        "estimated_minutes": 8,
        "questions": [
            {
                "text": "Jeg ___ kaffe hver morgen.",
                "question_type": Question.QuestionType.SINGLE_CHOICE,
                "options": [
                    ("drikker", True),
                    ("drikke", False),
                    ("drikk", False),
                ],
            },
            {
                "text": "Hvordan sier du 'thank you' på norsk?",
                "question_type": Question.QuestionType.SINGLE_CHOICE,
                "options": [
                    ("Unnskyld", False),
                    ("Vær så god", False),
                    ("Takk", True),
                ],
            },
            {
                "text": "Fullfør setningen: 'Vi snakkes ___!'.",
                "question_type": Question.QuestionType.FILL_IN,
                "options": [
                    ("senere", True),
                    ("snart", True),
                ],
            },
        ],
    },
    {
        "title": "Hverdagsprat",
        "slug": "a2-hverdagsprat",
        "description": "A2-nivå: vanlige uttrykk og enkel grammatikk.",
        "level": Test.Level.A2,
        "estimated_minutes": 10,
        "questions": [
            {
                "text": "Hvilket ord gjør setningen riktig? 'Hun ___ en kopp te nå.'",
                "question_type": Question.QuestionType.SINGLE_CHOICE,
                "options": [
                    ("drikk", False),
                    ("drikker", True),
                    ("drakk", False),
                ],
            },
            {
                "text": "Velg korrekt preposisjon: 'Han bor ___ Oslo.'",
                "question_type": Question.QuestionType.SINGLE_CHOICE,
                "options": [
                    ("på", False),
                    ("i", True),
                    ("til", False),
                ],
            },
            {
                "text": "Skriv riktig form av adjektivet: 'et ___ hus'.",
                "question_type": Question.QuestionType.FILL_IN,
                "options": [
                    ("stort", True),
                ],
            },
        ],
    },
    {
        "title": "Mellomnivå grammatikk",
        "slug": "b1-grammatikk",
        "description": "B1-nivå: setningsbygning og verbtid.",
        "level": Test.Level.B1,
        "estimated_minutes": 12,
        "questions": [
            {
                "text": "Velg korrekt verbtid: 'Da jeg kom hjem, ___ jeg middagen.'",
                "question_type": Question.QuestionType.SINGLE_CHOICE,
                "options": [
                    ("lager", False),
                    ("lagde", True),
                    ("har laget", False),
                ],
            },
            {
                "text": "Fullfør: 'Hvis jeg hadde tid, ___ jeg mer norsk.'",
                "question_type": Question.QuestionType.SINGLE_CHOICE,
                "options": [
                    ("lærer", False),
                    ("ville ha lært", True),
                    ("har lært", False),
                ],
            },
            {
                "text": "Hva er riktig omskriving? 'Boken ble lest av mange.'",
                "question_type": Question.QuestionType.FILL_IN,
                "options": [
                    ("Mange leste boken", True),
                ],
            },
        ],
    },
    {
        "title": "Høyere nivå forståelse",
        "slug": "b2-forstaelse",
        "description": "B2-nivå: nyanser og naturlige uttrykk.",
        "level": Test.Level.B2,
        "estimated_minutes": 15,
        "questions": [
            {
                "text": "Velg mest naturlige uttrykket: 'Det er på høy tid at vi ___.'",
                "question_type": Question.QuestionType.SINGLE_CHOICE,
                "options": [
                    ("starter opp", False),
                    ("setter i gang", True),
                    ("begynner på", False),
                ],
            },
            {
                "text": "Fullfør idiomet: 'å gå over ___'.",
                "question_type": Question.QuestionType.FILL_IN,
                "options": [
                    ("lik", True),
                    ("levende", False),
                ],
            },
            {
                "text": "Hvilket bindeord passer best? 'Han kom ikke, ___ han var invitert.'",
                "question_type": Question.QuestionType.SINGLE_CHOICE,
                "options": [
                    ("selv om", True),
                    ("fordi", False),
                    ("mens", False),
                ],
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Seed sample A1-B2 tests with questions and options."

    def handle(self, *args, **options):
        created_tests = 0
        for test_data in SAMPLE_TESTS:
            test, created = Test.objects.get_or_create(
                slug=test_data["slug"],
                defaults={
                    "title": test_data["title"],
                    "description": test_data["description"],
                    "level": test_data["level"],
                    "estimated_minutes": test_data["estimated_minutes"],
                    "is_published": True,
                },
            )
            if not created:
                self.stdout.write(f"Skipping existing test: {test.slug}")
                continue

            created_tests += 1
            for order, question_data in enumerate(test_data["questions"], start=1):
                question = Question.objects.create(
                    test=test,
                    text=question_data["text"],
                    question_type=question_data["question_type"],
                    order=order,
                )
                for opt_order, (text, is_correct) in enumerate(
                    question_data["options"], start=1
                ):
                    Option.objects.create(
                        question=question,
                        text=text,
                        is_correct=is_correct,
                        order=opt_order,
                    )

        self.stdout.write(self.style.SUCCESS(f"Seed complete. Added {created_tests} tests."))
