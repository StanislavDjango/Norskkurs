from rest_framework import serializers

from .models import (
    Answer,
    Assignment,
    Exercise,
    Expression,
    GlossaryTerm,
    Homework,
    Material,
    Option,
    Question,
    Reading,
    StudentProfile,
    Submission,
    Test,
    VerbEntry,
)


class OptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Option
        fields = ("id", "text", "order")


class QuestionSerializer(serializers.ModelSerializer):
    options = OptionSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ("id", "text", "question_type", "order", "options")


class TestListSerializer(serializers.ModelSerializer):
    question_count = serializers.IntegerField(read_only=True)
    question_mode = serializers.SerializerMethodField()
    is_restricted = serializers.BooleanField(read_only=True)

    class Meta:
        model = Test
        fields = (
            "id",
            "title",
            "slug",
            "description",
            "level",
            "stream",
            "estimated_minutes",
            "question_count",
            "question_mode",
            "is_restricted",
        )

    def get_question_mode(self, obj: Test) -> str:
        return obj.question_mode


class TestDetailSerializer(TestListSerializer):
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta(TestListSerializer.Meta):
        fields = TestListSerializer.Meta.fields + ("questions",)


class AnswerInputSerializer(serializers.Serializer):
    question = serializers.IntegerField()
    selected_option = serializers.IntegerField(required=False, allow_null=True)
    text_response = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )


class SubmissionSerializer(serializers.ModelSerializer):
    percent = serializers.FloatField(read_only=True)

    class Meta:
        model = Submission
        fields = (
            "id",
            "test",
            "name",
            "email",
            "score",
            "total_questions",
            "percent",
            "created_at",
        )


class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ("id", "question", "selected_option", "text_response", "is_correct")


class AssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assignment
        fields = ("id", "test", "student_email", "expires_at", "created_at")


class StudentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = (
            "email",
            "stream",
            "level",
            "allow_stream_change",
            "teacher",
        )
        read_only_fields = ("teacher",)


class MaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Material
        fields = (
            "id",
            "title",
            "stream",
            "level",
            "material_type",
            "body",
            "url",
            "tags",
            "is_published",
            "assigned_to_email",
            "created_at",
        )
        read_only_fields = ("is_published", "created_at")


class HomeworkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Homework
        fields = (
            "id",
            "title",
            "stream",
            "level",
            "due_date",
            "instructions",
            "attachments",
            "status",
            "assigned_to_email",
            "student_submission",
            "feedback",
            "teacher",
            "created_at",
        )
        read_only_fields = ("status", "teacher", "feedback", "created_at")


class ExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exercise
        fields = (
            "id",
            "title",
            "stream",
            "level",
            "kind",
            "prompt",
            "data",
            "tags",
            "estimated_minutes",
            "assigned_to_email",
            "created_at",
        )
        read_only_fields = ("created_at",)


class VerbEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = VerbEntry
        fields = (
            "id",
            "verb",
            "stream",
            "infinitive",
            "present",
            "past",
            "perfect",
            "examples_infinitive",
            "examples_present",
            "examples_past",
            "examples_perfect",
            "translation_en",
            "translation_ru",
            "translation_nb",
            "tags",
        )


class ExpressionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expression
        fields = ("id", "phrase", "meaning", "example", "stream", "tags")


class GlossaryTermSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlossaryTerm
        fields = (
            "id",
            "term",
            "translation",
            "translation_en",
            "translation_ru",
            "translation_nb",
            "explanation",
            "stream",
            "level",
            "tags",
        )


class ReadingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reading
        fields = (
            "id",
            "title",
            "slug",
            "stream",
            "level",
            "body",
            "translation",
            "tags",
            "is_published",
            "created_at",
        )
        read_only_fields = ("is_published", "created_at")
