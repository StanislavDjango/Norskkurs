from django.contrib import admin

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
    StudentProfile,
    Submission,
    Test,
    VerbEntry,
)


class OptionInline(admin.TabularInline):
    model = Option
    extra = 1


class QuestionInline(admin.StackedInline):
    model = Question
    extra = 1
    show_change_link = True
    fields = ("text", "question_type", "order", "explanation")


@admin.register(Test)
class TestAdmin(admin.ModelAdmin):
    list_display = ("title", "stream", "level", "is_published", "question_count", "updated_at")
    list_filter = ("stream", "level", "is_published")
    search_fields = ("title", "description", "slug")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [QuestionInline]
    ordering = ("stream", "level", "title")


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("text", "test", "question_type", "order")
    list_filter = ("test__stream", "test__level", "question_type")
    search_fields = ("text",)
    inlines = [OptionInline]
    ordering = ("test", "order")


class AnswerInline(admin.TabularInline):
    model = Answer
    extra = 0
    readonly_fields = ("question", "selected_option", "text_response", "is_correct")


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ("test", "name", "email", "score", "total_questions", "percent", "created_at")
    list_filter = ("test__level", "created_at")
    search_fields = ("name", "email")
    readonly_fields = ("score", "total_questions", "percent", "created_at")
    inlines = [AnswerInline]


@admin.register(Option)
class OptionAdmin(admin.ModelAdmin):
    list_display = ("text", "question", "is_correct", "order")
    list_filter = ("question__test",)
    ordering = ("question", "order")


@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ("submission", "question", "selected_option", "is_correct")
    list_filter = ("is_correct", "question__test__level")
    search_fields = ("question__text", "selected_option__text")


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ("student_email", "test", "assigned_by", "created_at", "expires_at")
    search_fields = ("student_email", "test__title", "test__slug")
    list_filter = ("test__level", "test__is_restricted")


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ("email", "stream", "level", "allow_stream_change", "teacher", "updated_at")
    search_fields = ("email",)
    list_filter = ("stream", "level", "allow_stream_change")


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ("title", "stream", "level", "material_type", "is_published", "assigned_to_email")
    search_fields = ("title", "tags")
    list_filter = ("stream", "level", "material_type", "is_published")


@admin.register(Homework)
class HomeworkAdmin(admin.ModelAdmin):
    list_display = ("title", "stream", "level", "status", "due_date", "assigned_to_email")
    search_fields = ("title", "instructions")
    list_filter = ("stream", "level", "status")


@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ("title", "stream", "level", "kind", "estimated_minutes", "assigned_to_email")
    search_fields = ("title", "prompt", "tags")
    list_filter = ("stream", "level", "kind")


@admin.register(VerbEntry)
class VerbEntryAdmin(admin.ModelAdmin):
    list_display = ("verb", "stream", "infinitive", "present", "past", "perfect")
    search_fields = ("verb", "infinitive", "tags")
    list_filter = ("stream",)


@admin.register(Expression)
class ExpressionAdmin(admin.ModelAdmin):
    list_display = ("phrase", "stream")
    search_fields = ("phrase", "meaning", "tags")
    list_filter = ("stream",)


@admin.register(GlossaryTerm)
class GlossaryTermAdmin(admin.ModelAdmin):
    list_display = ("term", "stream", "level")
    search_fields = ("term", "translation", "explanation", "tags")
    list_filter = ("stream", "level")
