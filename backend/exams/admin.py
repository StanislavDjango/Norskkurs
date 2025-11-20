import csv
import io

from django import forms
from django.contrib import admin, messages
from django.http import HttpResponse
from django.shortcuts import redirect
from django.template.response import TemplateResponse
from django.urls import path
from django.utils.translation import gettext_lazy as _

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
from .utils.verb_csv import export_verbs_to_file, import_verbs_from_reader


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


class VerbImportForm(forms.Form):
    csv_file = forms.FileField(label=_("CSV file"))
    update_existing = forms.BooleanField(required=False, label=_("Update existing entries"))


@admin.register(VerbEntry)
class VerbEntryAdmin(admin.ModelAdmin):
    list_display = ("verb", "stream", "infinitive", "present", "past", "perfect")
    search_fields = ("verb", "infinitive", "tags")
    list_filter = ("stream",)
    change_list_template = "admin/exams/verbentry/change_list.html"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "export-csv/",
                self.admin_site.admin_view(self.export_csv_view),
                name="exams_verbentry_export_csv",
            ),
            path(
                "import-csv/",
                self.admin_site.admin_view(self.import_csv_view),
                name="exams_verbentry_import_csv",
            ),
        ]
        return custom_urls + urls

    def export_csv_view(self, request):
        queryset = self.get_queryset(request)
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="verbs-template.csv"'
        export_verbs_to_file(response, queryset)
        return response

    def import_csv_view(self, request):
        if request.method == "POST":
            form = VerbImportForm(request.POST, request.FILES)
            if form.is_valid():
                upload = form.cleaned_data["csv_file"]
                try:
                    decoded = upload.read().decode("utf-8")
                except UnicodeDecodeError:
                    form.add_error("csv_file", _("File must be UTF-8 encoded."))
                else:
                    reader = csv.DictReader(io.StringIO(decoded))
                    try:
                        stats = import_verbs_from_reader(
                            reader, update=form.cleaned_data["update_existing"]
                        )
                    except ValueError as exc:
                        form.add_error("csv_file", str(exc))
                    else:
                        messages.success(
                            request,
                            _(
                                "Import finished. Created: %(created)d Updated: %(updated)d Skipped: %(skipped)d"
                            )
                            % {
                                "created": stats.created,
                                "updated": stats.updated,
                                "skipped": stats.skipped,
                            },
                        )
                        return redirect("admin:exams_verbentry_changelist")
        else:
            form = VerbImportForm()
        context = {
            **self.admin_site.each_context(request),
            "opts": self.model._meta,
            "form": form,
            "title": _("Import verbs from CSV"),
        }
        return TemplateResponse(request, "admin/exams/verbentry/import_csv.html", context)


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
