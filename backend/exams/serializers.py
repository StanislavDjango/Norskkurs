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
    UserLexeme,
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


class RegistrationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    name = serializers.CharField(required=False, allow_blank=True)


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField()
    password = serializers.CharField(write_only=True)


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
            "part_of_speech",
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
        fields = (
            "id",
            "phrase",
            "meaning_en",
            "meaning_nb",
            "meaning_nn",
            "meaning_ru",
            "example",
            "stream",
            "tags",
        )


class GlossaryTermSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlossaryTerm
        fields = (
            "id",
            "term",
            "translation",
            "translation_en",
            "translation_ru",
            "translation_nn",
            "translation_nb",
            "explanation",
            "stream",
            "level",
            "tags",
        )


class UserLexemeSerializer(serializers.ModelSerializer):
    MAX_TEXT_LENGTH = 500
    MAX_TRANSLATION_LENGTH = 500
    MAX_NOTES_LENGTH = 1000
    MAX_EXAMPLE_LENGTH = 1000
    MAX_TAG_LENGTH = 40

    @classmethod
    def _normalize_text(cls, value: str) -> str:
        return " ".join((value or "").split()).strip()

    @classmethod
    def _validate_length(cls, value: str, max_len: int, field: str) -> None:
        if value and len(value) > max_len:
            raise serializers.ValidationError(
                {field: f"Ensure this field has no more than {max_len} characters."}
            )

    @classmethod
    def _normalize_tags(cls, value: object) -> list[str]:
        if value is None:
            raw_tags = []
        elif isinstance(value, str):
            raw_tags = value.split(",")
        elif isinstance(value, (list, tuple)):
            raw_tags = value
        else:
            raw_tags = []

        tags: list[str] = []
        for raw in raw_tags:
            if not isinstance(raw, str):
                continue
            cleaned = cls._normalize_text(raw).lower()
            if not cleaned:
                continue
            cls._validate_length(cleaned, cls.MAX_TAG_LENGTH, "tags")
            if cleaned not in tags:
                tags.append(cleaned)
        return tags

    class Meta:
        model = UserLexeme
        read_only_fields = (
            "id",
            "user",
            "times_reviewed",
            "times_correct",
            "last_reviewed_at",
            "created_at",
            "updated_at",
        )
        fields = (
            "id",
            "source",
            "kind",
            "glossary_term",
            "concept_key",
            "text",
            "translation_en",
            "translation_ru",
            "translation_nb",
            "translation_nn",
            "example",
            "notes",
            "tags",
            "language",
            "level",
            "times_reviewed",
            "times_correct",
            "last_reviewed_at",
            "is_archived",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        user = self.context["request"].user
        if not user or not user.is_authenticated:
            raise serializers.ValidationError("Authentication required.")

        instance = getattr(self, "instance", None)
        source = (
            attrs.get("source")
            or (instance.source if instance else None)
            or UserLexeme.Source.CUSTOM
        )
        glossary_term = (
            attrs.get("glossary_term")
            if "glossary_term" in attrs
            else (instance.glossary_term if instance else None)
        )
        language_provided = "language" in attrs
        language = (
            attrs.get("language")
            if language_provided
            else (instance.language if instance else "")
        )
        level = (
            attrs.get("level")
            if "level" in attrs
            else (instance.level if instance else "")
        )

        text = self._normalize_text(
            attrs.get("text")
            if "text" in attrs
            else (instance.text if instance else "")
        )
        translation_en = self._normalize_text(
            attrs.get("translation_en")
            if "translation_en" in attrs
            else (instance.translation_en if instance else "")
        )
        translation_nb = self._normalize_text(
            attrs.get("translation_nb")
            if "translation_nb" in attrs
            else (instance.translation_nb if instance else "")
        )
        translation_nn = self._normalize_text(
            attrs.get("translation_nn")
            if "translation_nn" in attrs
            else (instance.translation_nn if instance else "")
        )
        translation_ru = self._normalize_text(
            attrs.get("translation_ru")
            if "translation_ru" in attrs
            else (instance.translation_ru if instance else "")
        )
        notes = self._normalize_text(
            attrs.get("notes")
            if "notes" in attrs
            else (instance.notes if instance else "")
        )
        example = self._normalize_text(
            attrs.get("example")
            if "example" in attrs
            else (instance.example if instance else "")
        )
        tags = self._normalize_tags(
            attrs.get("tags")
            if "tags" in attrs
            else (instance.tags if instance else [])
        )

        if source == UserLexeme.Source.GLOSSARY:
            if not glossary_term:
                raise serializers.ValidationError(
                    {"glossary_term": "Glossary term is required for glossary source."}
                )
            if (
                language_provided
                and language
                and glossary_term.stream
                and language != glossary_term.stream
            ):
                raise serializers.ValidationError(
                    {"language": "Language must match glossary term stream."}
                )
            if not text:
                text = glossary_term.term
            translation_en = translation_en or glossary_term.translation_en
            translation_nb = translation_nb or glossary_term.translation_nb
            translation_nn = translation_nn or glossary_term.translation_nn
            translation_ru = translation_ru or glossary_term.translation_ru
            language = glossary_term.stream or language
            level = level or glossary_term.level

        language = (language or "").strip().lower()
        level = (level or "").strip().upper()

        self._validate_length(text, self.MAX_TEXT_LENGTH, "text")
        self._validate_length(
            translation_en, self.MAX_TRANSLATION_LENGTH, "translation_en"
        )
        self._validate_length(
            translation_nb, self.MAX_TRANSLATION_LENGTH, "translation_nb"
        )
        self._validate_length(
            translation_nn, self.MAX_TRANSLATION_LENGTH, "translation_nn"
        )
        self._validate_length(
            translation_ru, self.MAX_TRANSLATION_LENGTH, "translation_ru"
        )
        self._validate_length(notes, self.MAX_NOTES_LENGTH, "notes")
        self._validate_length(example, self.MAX_EXAMPLE_LENGTH, "example")

        if not any([translation_en, translation_nb, translation_nn, translation_ru]):
            raise serializers.ValidationError("Provide at least one translation.")

        raw_concept_key = attrs.get("concept_key") if "concept_key" in attrs else ""
        if raw_concept_key:
            parts = str(raw_concept_key).split("|")
            while len(parts) < 4:
                parts.append("")
            concept_key = UserLexeme.build_concept_key(
                translation_en=parts[0],
                translation_nb=parts[1],
                translation_nn=parts[2],
                translation_ru=parts[3],
            )
        else:
            concept_key = UserLexeme.build_concept_key(
                translation_en=translation_en,
                translation_nb=translation_nb,
                translation_nn=translation_nn,
                translation_ru=translation_ru,
            )

        attrs.update(
            {
                "glossary_term": glossary_term,
                "text": text,
                "translation_en": translation_en,
                "translation_nb": translation_nb,
                "translation_nn": translation_nn,
                "translation_ru": translation_ru,
                "notes": notes,
                "example": example,
                "tags": tags,
                "concept_key": concept_key,
                "language": language,
                "level": level,
            }
        )
        return attrs

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if instance.user != self.context["request"].user:
            raise serializers.ValidationError("Cannot edit another user's item.")
        return super().update(instance, validated_data)


class ReadingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reading
        fields = (
            "id",
            "title",
            "title_en",
            "title_nb",
            "title_nn",
            "title_ru",
            "slug",
            "stream",
            "level",
            "body",
            "translation_en",
            "translation_nb",
            "translation_nn",
            "translation_ru",
            "tags",
            "is_published",
            "created_at",
        )
        read_only_fields = ("is_published", "created_at")
