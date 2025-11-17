from rest_framework import serializers

from .models import Answer, Option, Question, Submission, Test


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

    class Meta:
        model = Test
        fields = (
            "id",
            "title",
            "slug",
            "description",
            "level",
            "estimated_minutes",
            "question_count",
            "question_mode",
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
    text_response = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class SubmissionSerializer(serializers.ModelSerializer):
    percent = serializers.FloatField(read_only=True)

    class Meta:
        model = Submission
        fields = ("id", "test", "name", "email", "score", "total_questions", "percent", "created_at")


class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ("id", "question", "selected_option", "text_response", "is_correct")
