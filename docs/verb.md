# Verb module documentation

## 1. Overview
Work on the Verb section included three directions:
1. **UI/UX overhaul** — full-width React panel with filters, modal preview, tag chips and bookmarks.
2. **Admin experience** — CSV import/export actions and polished forms for non-technical teachers.
3. **Data layer** — structured verb library with 56 verbs per stream, each containing tense-specific examples.

This file describes the changes and how to operate them.

---

## 2. Frontend (React / Vite)

### 2.1 Layout and filters
- **Alphabet filter** (`verbLetter`) – three-state logic: “All”, letter, letter+topic.
- **Topic filter** (`verbTag`) – tags derived from verb metadata (`work`, `travel`, `culture`, ...). Selecting a topic resets alphabet filter to “All” and vice versa.
- **Search bar** – positioned to the right of topic chips; strips leading `å/to` automatically so the teacher can type bare verb forms.
- **Pagination** – Intersection Observer + manual “Load more” fallback. Default 15 verbs per batch.
- **Responsive table** – columns: Infinitive / Present / Past / Perfect / “Show example”; badges display `stream` and `level`. Tags shown as chips.

### 2.2 Modal & examples
- Each verb has `examples_infinitive/present/past/perfect`. Modal displays one column at a time, accessible through CTA button.
- `verbFormOrder` ensures consistent ordering and translation keys `formTitles.*` drive the display headings.

### 2.3 Bookmarks / “My list”
- State `verbFavorites` (array of IDs) is stored in `localStorage` under `norskkurs_verb_favs`.
- Bookmark toggle per row (`verb-bookmark` button), with active/inactive icon and tooltip text from translations.
- View switcher `verbView` (All verbs / Bookmarks) sits below topics. When `verbView === "favorites"`, the alphabet and topic filters continue to work but only within favorites.

### 2.4 Usage instructions
1. **Search** – type base verb without article (system strips leading `å/to` automatically).
2. **Filter by letter** – click letter buttons; disabled ones indicate no verbs for that letter under current topic/view.
3. **Filter by topic** – select chip under alphabet; label `All topics` resets.
4. **Bookmark** – click the star icon; a counter shows within the “Bookmarks” tab.
5. **Show example** – click CTA, choose tense in modal, review sentences, close with “×”.

Translations for new elements live in `frontend/src/i18n.ts`.

---

## 3. Admin (Jazzmin Django Admin)

### 3.1 Buttons on changelist
- Located top-right on VerbEntry list:
  1. `Add verb entry` (default Jazzmin action)
  2. `Download CSV template`
  3. `Import CSV`
- Custom template `backend/exams/templates/admin/exams/verbentry/change_list.html` injects these links and custom styles.

### 3.2 CSV format
Order of columns for both export and import:
```
examples_infinitive, examples_past, examples_perfect, examples_present,
infinitive, past, perfect, present,
stream, tags, verb
```
- Examples use `" | "` as separator inside a cell; importer converts to multi-line string.
- Tags separated by `;`.
- UTF-8 BOM ensures Excel renders `å, ø, æ` correctly.

### 3.3 Workflow
1. **Download template** for the current dataset.
2. **Edit** in Excel/Google Sheets (preserving header order).
3. **Import CSV**:
   - Upload file.
   - Optional checkbox “Update existing entries” controls overwriting (matching by `(stream, verb)`).
   - On success, admin message summarises created/updated/skipped counts.

### 3.4 Import form design
- Dedicated template `import_csv.html`: card layout, descriptive text, styled buttons.

---

## 4. Data layer / Seeder

### 4.1 Verb library
- File: `backend/exams/data/verb_library.py`
- Contains `VERB_BLUEPRINTS` (list of dicts) – each entry describes forms for Bokmål/Nynorsk/English plus tags and context used to generate examples.
- Utility functions generate sentences for each tense (infinitive, present, past, perfect).

### 4.2 Management command `seed_sample_data`
- Deletes existing tests & verbs, repopulates with real test content plus 168 verb entries (56 per stream).
- Stores examples per field, plus tags and metadata.

### 4.3 CSV utilities
- `backend/exams/utils/verb_csv.py` exports/imports CSV with the new structure and BOM.
- Both management commands (`export_verbs_csv`, `import_verbs_csv`) leverage the utility.

### 4.4 Usage tips
- To extend dataset: update `VERB_BLUEPRINTS`, rerun `python manage.py seed_sample_data`.
- To share content with teachers: export template, let them edit, re-import with “Update existing entries”.

---

## 5. Quick command reference
- `python manage.py export_verbs_csv --output verbs-template.csv`
- `python manage.py import_verbs_csv verbs-template.csv --update`
- `docker compose run --rm backend python manage.py seed_sample_data`

---

This document should serve as a reference for future contributors and teachers using the Verb module.
