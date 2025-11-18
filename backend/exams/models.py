from django.db import models
from django.utils.translation import gettext_lazy as _


class Test(models.Model):
    class Level(models.TextChoices):
        A1 = "A1", _("A1 – Beginner")
        A2 = "A2", _("A2 – Elementary")
        B1 = "B1", _("B1 – Intermediate")
        B2 = "B2", _("B2 – Upper-intermediate")

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    level = models.CharField(max_length=2, choices=Level.choices)
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
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="options")
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
    locale = models.CharField(max_length=5, choices=[("en", "English"), ("nb", "Norsk")], default="en")

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
        "auth.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_tests"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("test", "student_email")
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.student_email} -> {self.test.slug}"
