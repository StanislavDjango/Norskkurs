from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Test(models.Model):
    class Stream(models.TextChoices):
        BOKMAAL = "bokmaal", _("Bokmal")
        NYNORSK = "nynorsk", _("Nynorsk")
        ENGLISH = "english", _("English")

    class Level(models.TextChoices):
        A1 = "A1", _("A1 - Beginner")
        A2 = "A2", _("A2 - Elementary")
        B1 = "B1", _("B1 - Intermediate")
        B2 = "B2", _("B2 - Upper-intermediate")

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    level = models.CharField(max_length=2, choices=Level.choices)
    stream = models.CharField(
        max_length=20,
        choices=Stream.choices,
        default=Stream.BOKMAAL,
        help_text="Content stream: Bokmal, Nynorsk or English",
    )
    estimated_minutes = models.PositiveIntegerField(default=10)
    is_published = models.BooleanField(default=False)
    is_restricted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["level", "title"]

    def __str__(self) -> str:
        return f"{self.title} ({self.level})"

    @property
    def question_count(self) -> int:
        return self.questions.count()

    @property
    def question_mode(self) -> str:
        q_types = set(self.questions.values_list("question_type", flat=True))
        if len(q_types) == 1:
            return q_types.pop()
        return "mixed"


class Question(models.Model):
    class QuestionType(models.TextChoices):
        SINGLE_CHOICE = "single", _("Single choice")
        FILL_IN = "fill", _("Fill in the blank")

    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name="questions")
    text = models.TextField()
    question_type = models.CharField(
        max_length=10, choices=QuestionType.choices, default=QuestionType.SINGLE_CHOICE
    )
    order = models.PositiveIntegerField(default=1)
    explanation = models.TextField(blank=True)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self) -> str:
        return f"{self.test.title} - {self.text[:40]}"


class Option(models.Model):
    question = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name="options"
    )
    text = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self) -> str:
        return self.text


class Submission(models.Model):
    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name="submissions")
    name = models.CharField(max_length=120, blank=True)
    email = models.EmailField(blank=True)
    score = models.PositiveIntegerField(default=0)
    total_questions = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    locale = models.CharField(
        max_length=5,
        choices=[("en", "English"), ("nb", "Norsk"), ("ru", "Russian")],
        default="en",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.test.title} submission ({self.created_at:%Y-%m-%d})"

    @property
    def percent(self) -> float:
        if not self.total_questions:
            return 0.0
        return round(self.score / self.total_questions * 100, 2)


class Answer(models.Model):
    submission = models.ForeignKey(
        Submission, on_delete=models.CASCADE, related_name="answers"
    )
    question = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name="answers"
    )
    selected_option = models.ForeignKey(
        Option, on_delete=models.SET_NULL, null=True, blank=True, related_name="answers"
    )
    text_response = models.TextField(blank=True)
    is_correct = models.BooleanField(default=False)

    class Meta:
        unique_together = ("submission", "question")

    def __str__(self) -> str:
        return f"Answer to {self.question_id}"


class Assignment(models.Model):
    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name="assignments")
    student_email = models.EmailField()
    assigned_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tests",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("test", "student_email")
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.student_email} -> {self.test.slug}"


class StudentProfile(models.Model):
    Stream = Test.Stream
    Level = Test.Level

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="student_profile",
    )
    email = models.EmailField(unique=True)
    stream = models.CharField(
        max_length=20, choices=Stream.choices, default=Stream.BOKMAAL
    )
    level = models.CharField(max_length=2, choices=Level.choices, default=Level.A1)
    allow_stream_change = models.BooleanField(default=True)
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="students_assigned",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["email"]

    def __str__(self) -> str:
        return f"{self.email} ({self.stream}, {self.level})"


class Material(models.Model):
    class MaterialType(models.TextChoices):
        TEXT = "text", _("Text")
        VIDEO = "video", _("Video")
        AUDIO = "audio", _("Audio")

    title = models.CharField(max_length=255)
    stream = models.CharField(
        max_length=20, choices=Test.Stream.choices, default=Test.Stream.BOKMAAL
    )
    level = models.CharField(
        max_length=2, choices=Test.Level.choices, default=Test.Level.A1
    )
    material_type = models.CharField(
        max_length=10, choices=MaterialType.choices, default=MaterialType.TEXT
    )
    body = models.TextField(blank=True)
    url = models.URLField(blank=True)
    tags = models.JSONField(default=list, blank=True)
    is_published = models.BooleanField(default=True)
    assigned_to_email = models.EmailField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["level", "title"]

    def __str__(self) -> str:
        return f"{self.title} ({self.stream}, {self.level})"


class Reading(models.Model):
    title = models.CharField(max_length=255)
    title_en = models.CharField(max_length=255, blank=True, default="")
    title_nb = models.CharField(max_length=255, blank=True, default="")
    title_nn = models.CharField(max_length=255, blank=True, default="")
    title_ru = models.CharField(max_length=255, blank=True, default="")
    slug = models.SlugField(max_length=255, unique=True)
    stream = models.CharField(
        max_length=20, choices=Test.Stream.choices, default=Test.Stream.BOKMAAL
    )
    level = models.CharField(
        max_length=2, choices=Test.Level.choices, default=Test.Level.A1
    )
    body = models.TextField()
    translation_en = models.TextField(blank=True, default="")
    translation_nb = models.TextField(blank=True, default="")
    translation_nn = models.TextField(blank=True, default="")
    translation_ru = models.TextField(blank=True)
    tags = models.JSONField(default=list, blank=True)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["level", "title"]

    def __str__(self) -> str:
        return f"{self.title} ({self.stream}, {self.level})"


class Homework(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", _("Draft")
        PUBLISHED = "published", _("Published")
        CLOSED = "closed", _("Closed")

    title = models.CharField(max_length=255)
    stream = models.CharField(
        max_length=20, choices=Test.Stream.choices, default=Test.Stream.BOKMAAL
    )
    level = models.CharField(
        max_length=2, choices=Test.Level.choices, default=Test.Level.A1
    )
    due_date = models.DateTimeField(null=True, blank=True)
    instructions = models.TextField()
    attachments = models.JSONField(default=list, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PUBLISHED
    )
    assigned_to_email = models.EmailField(blank=True, null=True)
    student_submission = models.TextField(blank=True)
    feedback = models.TextField(blank=True)
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="homeworks_given",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-due_date", "-created_at"]

    def __str__(self) -> str:
        return f"{self.title} ({self.level})"


class Exercise(models.Model):
    class ExerciseKind(models.TextChoices):
        QUIZ = "quiz", _("Quiz")
        DICTATION = "dictation", _("Dictation")
        FLASHCARD = "flashcard", _("Flashcard")

    title = models.CharField(max_length=255)
    stream = models.CharField(
        max_length=20, choices=Test.Stream.choices, default=Test.Stream.BOKMAAL
    )
    level = models.CharField(
        max_length=2, choices=Test.Level.choices, default=Test.Level.A1
    )
    kind = models.CharField(
        max_length=20, choices=ExerciseKind.choices, default=ExerciseKind.QUIZ
    )
    prompt = models.TextField(blank=True)
    data = models.JSONField(default=dict, blank=True)
    tags = models.JSONField(default=list, blank=True)
    estimated_minutes = models.PositiveIntegerField(default=5)
    assigned_to_email = models.EmailField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["level", "title"]

    def __str__(self) -> str:
        return f"{self.title} ({self.kind})"


class VerbEntry(models.Model):
    verb = models.CharField(max_length=120)
    stream = models.CharField(
        max_length=20, choices=Test.Stream.choices, default=Test.Stream.BOKMAAL
    )
    infinitive = models.CharField(max_length=120)
    present = models.CharField(max_length=120)
    past = models.CharField(max_length=120)
    perfect = models.CharField(max_length=120)
    examples_infinitive = models.TextField(blank=True)
    examples_present = models.TextField(blank=True)
    examples_past = models.TextField(blank=True)
    examples_perfect = models.TextField(blank=True)
    translation_en = models.CharField(max_length=255, blank=True, default="")
    translation_ru = models.CharField(max_length=255, blank=True, default="")
    translation_nb = models.CharField(max_length=255, blank=True, default="")
    tags = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["verb"]

    def __str__(self) -> str:
        return self.verb


class Expression(models.Model):
    phrase = models.CharField(max_length=255)
    meaning_en = models.TextField(blank=True, default="")
    meaning_nb = models.TextField(blank=True, default="")
    meaning_ru = models.TextField(blank=True, default="")
    example = models.TextField(blank=True)
    stream = models.CharField(
        max_length=20, choices=Test.Stream.choices, default=Test.Stream.BOKMAAL
    )
    tags = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["phrase"]

    def __str__(self) -> str:
        return self.phrase


class GlossaryTerm(models.Model):
    term = models.CharField(max_length=255)
    translation = models.CharField(max_length=255, blank=True)
    translation_en = models.CharField(max_length=255, blank=True, default="")
    translation_ru = models.CharField(max_length=255, blank=True, default="")
    translation_nn = models.CharField(max_length=255, blank=True, default="")
    translation_nb = models.CharField(max_length=255, blank=True, default="")
    explanation = models.TextField(blank=True)
    stream = models.CharField(
        max_length=20, choices=Test.Stream.choices, default=Test.Stream.BOKMAAL
    )
    level = models.CharField(
        max_length=2, choices=Test.Level.choices, default=Test.Level.A1
    )
    tags = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["term"]
        unique_together = ("term", "stream", "level")

    def __str__(self) -> str:
        return f"{self.term} ({self.stream}, {self.level})"
