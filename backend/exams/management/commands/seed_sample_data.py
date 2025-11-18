from django.core.management.base import BaseCommand

from exams.models import Option, Question, Test


def build_questions(base_text: str, mode: str, total: int = 10) -> list[dict]:
    """
    Create a list of questions for a test.
    mode: single | fill | mixed (exam reuses mixed).
    total: number of questions per test.
    """
    questions: list[dict] = []
    for idx in range(1, total + 1):
        label = f"{base_text} #{idx}"
        if mode == "single":
            questions.append(
                {
                    "text": f"{label} – velg riktig ord",
                    "question_type": Question.QuestionType.SINGLE_CHOICE,
                    "options": [
                        ("riktig", True),
                        ("feil", False),
                        ("nesten", False),
                    ],
                }
            )
        elif mode == "fill":
            questions.append(
                {
                    "text": f"Fullfør setningen: {label} ___",
                    "question_type": Question.QuestionType.FILL_IN,
                    "options": [
                        ("riktig", True),
                        ("korrekt", True),
                    ],
                }
            )
        else:  # mixed
            if idx % 2 == 0:
                questions.append(
                    {
                        "text": f"{label} – velg riktig ord",
                        "question_type": Question.QuestionType.SINGLE_CHOICE,
                        "options": [
                            ("det stemmer", True),
                            ("kanskje", False),
                            ("feil", False),
                        ],
                    }
                )
            else:
                questions.append(
                    {
                        "text": f"Fullfør setningen: {label} ___",
                        "question_type": Question.QuestionType.FILL_IN,
                        "options": [
                            ("riktig", True),
                            ("korrekt", True),
                        ],
                    }
                )
    return questions


class Command(BaseCommand):
    help = "Seed 20 tests per level (A1-B2) across modes: single, fill, mixed, exam."

    def handle(self, *args, **options):
        Test.objects.all().delete()
        created_tests = 0
        modes = [
            ("single", "Multiple choice"),
            ("fill", "Fill-in"),
            ("mixed", "Mixed practice"),
            ("exam", "Exam pack"),
        ]
        levels = [
            (Test.Level.A1, "A1"),
            (Test.Level.A2, "A2"),
            (Test.Level.B1, "B1"),
            (Test.Level.B2, "B2"),
        ]

        for level, level_label in levels:
            for mode, mode_label in modes:
                for i in range(1, 6):
                    slug = f"{level_label.lower()}-{mode}-{i:02d}"
                    title = f"{level_label} {mode_label} {i}"
                    description = f"{mode_label} oppgaver for nivå {level_label}"
                    estimated = 8 + (i % 3) * 2

                    test, created = Test.objects.get_or_create(
                        slug=slug,
                        defaults={
                            "title": title,
                            "description": description,
                            "level": level,
                            "estimated_minutes": estimated,
                            "is_published": True,
                        },
                    )
                    if not created:
                        self.stdout.write(f"Skipping existing test: {slug}")
                        continue

                    created_tests += 1
                    question_mode = "mixed" if mode == "exam" else mode
                    questions = build_questions(f"Norsk setning {i}", question_mode, total=10)

                    for order, question_data in enumerate(questions, start=1):
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
