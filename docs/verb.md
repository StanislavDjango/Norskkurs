# Verb module summary

## Frontend (React)
- Simplified alphabet picker with topic filter (`verbTag`) and infinite scroll.
- Modal per-verb examples show tense-specific sentences; `Show example` button moves to a dedicated “Examples” column.
- “Bookmarks” mode saves favorite verbs to localStorage (`verbFavorites`) and exposes a dedicated tab.
- Responsive layout updates: grid cards with stream/level badges, verb table, and “Show example” column with modal trigger.
- UI strings localized via `i18n.ts`: `tagAll`, `verbTabs`, `addFavorite`, `removeFavorite`.

## Admin (Django/Jazzmin)
- VerbEntry changelist now exposes three matching actions:
  * `Add verb entry` (built-in)
  * `Download CSV template`
  * `Import CSV`
- Buttons share Jazzmin styling, equal widths, and spacing; “Import” page uses a card layout with descriptions and nicer controls.
- CSV template/export injects UTF-8 BOM + consistent column order so Excel keeps Norwegian letters (`å/ø/æ`).

## Data / Seeder
- `VERBS_BY_STREAM` expanded to 56 authentic verbs per stream (Bokmål, Nynorsk, English) with four tense forms and examples.
- Seeder populates `examples_infinitive/present/past/perfect` fields instead of a single blob, aligning with the new frontend modal.
- Verb library centralized in `backend/exams/data/verb_library.py`.
