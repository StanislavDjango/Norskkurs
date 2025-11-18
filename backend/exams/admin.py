from django.contrib import admin

from .models import Answer, Assignment, Option, Question, Submission, Test


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
    list_display = ("title", "level", "is_published", "question_count", "updated_at")
    list_filter = ("level", "is_published")
    search_fields = ("title", "description")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [QuestionInline]
    ordering = ("level", "title")


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("text", "test", "question_type", "order")
    list_filter = ("test__level", "question_type")
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
