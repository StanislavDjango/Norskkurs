# Norskkurs: три направления (Bokmål, Nynorsk, English)

Черновик организационной структуры сайта, ролей и данных под три потока с выбором при входе и быстрым переключателем в меню.

## Пользовательский поток
- Экран входа/настроек: выбрать направление (`bokmaal` | `nynorsk` | `english`) и уровень (A1–B2). Сохраняем в профиле/студентском слоте (email) + локально (localStorage) как fallback.
- Шапка/меню: виджеты «Текущий поток» и «Уровень» с кнопкой смены → открывает модал/панель с выбором, подтверждением и подсказкой, что отфильтруется контент.
- Фильтрация: все ленты (материалы, тесты, упражнения, ДЗ, глоссарий) принимают `stream` и `level` как обязательные фильтры; дополнительные теги/темы — вторичный фильтр.
- Роли: учитель задаёт поток+уровень студенту и выдаёт назначения (tests/homework/exercises/materials). Студент видит свой поток; может сменить поток в Settings, если `allow_stream_change` включён (флаг на профиле/классе).

## Информация и меню
- Dashboard: карточки «Текущий тест/ДЗ», прогресс по уровню, быстрые ссылки на последний материал/упражнения.
- Materialer: тексты/видео/аудио по потоку/уровню, фильтры по тегам/типу.
- Øvinger: мини-квизы/диктанты/flashcards, ежедневные задания.
- Test: существующие placement/практика, теперь с полем `stream`.
- Hjemmelekse: домашки с дедлайном, статусом, загрузками и фидбеком.
- Verb/grammatikk: таблицы спряжений + примеры, поиск/фильтр по времени/типу глагола.
- Uttrykk/idiomer: карточки устойчивых выражений с пояснением/примером.
- Ordliste: словарь ключевых слов урока/уровня, быстрый поиск.
- Lytte/lese: подборка аудио/чтения (B1/B2) с вопросами на понимание.
- Kontakt/FAQ: справка, контактные каналы.

## Данные/модели (Django)
- Общий enum `Stream` (choices: `bokmaal`, `nynorsk`, `english`) и `Level` (A1–B2).
- `StudentProfile`: {email[user FK?], stream, level, allow_stream_change: bool, teacher: User?, updated_at}. Используется в фильтрах и хедерах.
- `Test` (добавить `stream` + `is_restricted` уже есть). `Assignment` ссылается на `Test` и `student_email` — уважает `stream/level`.
- `Material`: {title, stream, level, type[text|video|audio], body, url, tags, is_published, assigned_to_email?}
- `Homework`: {title, stream, level, due_date, instructions, attachments, status[draft/published/closed], assigned_to_email?, teacher_note, student_submission(text|file_url), feedback}.
- `Exercise`: {title, stream, level, kind[quiz|dictation|flashcard], prompt, data(json), tags, estimated_minutes, assigned_to_email?}.
- `VerbEntry`: {verb, stream, forms{infinitive,present,past,perfect}, examples:text[], tags}.
- `Expression`: {phrase, meaning, example, tags, stream}.
- `GlossaryTerm`: {term, translation, explanation, stream, level, tags}.

## API (REST)
- Общие query params: `stream`, `level`, `student_email` (для назначений). Все list-эндпоинты фильтруют по stream/level.
- `GET /profile/me/` → +`stream`, `level`, `allow_stream_change`.
- `POST /profile/me/stream/` → смена потока/уровня (с проверкой allow flag).
- `GET /tests/`, `/tests/<slug>/` → включают `stream`; `submit` остаётся, но валидирует назначение и stream.
- `GET /materials/`, `/materials/<id>/`
- `GET /homework/`, `POST /homework/<id>/submit`, `GET /homework/<id>/feedback`
- `GET /exercises/` (мини-контент для дня), `POST /exercises/<id>/submit`
- `GET /verbs/`, `GET /expressions/`, `GET /glossary/`

## Frontend (React/Vite)
- Глобальный state: `stream`, `level`, `interfaceLanguage`. Источник: профиль API → fallback localStorage → default `bokmaal` + A1.
- Хедер: переключатель stream (3 кнопки) и level (A1–B2), индикатор текущего потока; язык интерфейса (EN/NO/RU).
- Навигация: Dashboard / Materialer / Øvinger / Test / Hjemmelekse / Verb / Uttrykk / Ordliste / Kontakt.
- Фильтры на страницах: stream (disabled если фиксирован teacher), level, tag/tema, поиск.
- Dashboard виджеты: «Текущий поток/уровень», «Назначено учителем» (тест, ДЗ, упражнение), «Быстрый старт» для ежедневной Øving.
- Компоненты данных: списки карточек с бейджами stream+level; таблицы Verb/Uttrykk с поиском; формы отправки ДЗ/упражнений.
- API-клиент: добавляет `stream/level/student_email` ко всем запросам.

## Назначения и доступ
- Учитель в админке: выбирает stream/level для студента (по email), выдаёт тесты/ДЗ/упражнения; может запретить смену потока.
- Клиент: если тест/материал/ДЗ `is_restricted`, требуется совпадение email в query и назначении; иначе 403.
- Переключение потока: если запрещено, показать подсказку «обратитесь к учителю».

## Интернационализация
- Интерфейсные строки: EN/NO/RU; стримы отображать как «Bokmål», «Nynorsk», «English» (без перевода ключей в API).
- Контент: привязан к stream, не переводится автоматически; English-поток может зеркалить норвежский позже.
