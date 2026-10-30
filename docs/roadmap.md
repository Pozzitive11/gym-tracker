---
status: living
updated_at: "2026-10-30"
---

# Roadmap — gym-tracker

> **A decomposition, not a promise.** The overall idea broken into incremental steps: what each
> step is, where it comes from, how big it is — or that nobody has looked at it yet — and in which
> order, and parallel lanes, we walk them. **No dates** (except shipped history), **no scores** —
> order is the prioritization. The *solution* for any step lives in its `docs/features/<slug>/`
> spec, not here.

## Destination

Після завершення тренування з підходами атлет одразу бачить за власною адресою, що переживає перезавантаження, підсумок цього тренування — обʼєм, тривалість, ріст по вправах і побиті рекорди — з анімацією «моменту нагороди».

## Steps

| # | Step | Source | Size | Status |
|---|---|---|:---:|---|
| 1 | Підсумок з обʼємом і тривалістю: «Завершити» на екрані тренування з підходами відкриває сторінку підсумку за її адресою замість головної | `docs/idea-brief.md` §2 Problem, §7 Recommendation | S | idea |
| 2 | Ріст і рекорди по вправах: на підсумку кожна виконана вправа показує робочу вагу проти минулого разу й позначку рекорду; вправа без історії — без порівняння | `docs/idea-brief.md` §7 Recommendation, §6 Risks | S | idea |
| 3 | Анімація нагороди: помітна анімація появи підсумку, лише на цьому екрані | `docs/idea-brief.md` §7 Recommendation; `app-design.md` §5 Підсумок після тренування | XS | idea |

## Not yet specified

Порожньо — бриф сформулював усі кроки достатньо точно, щоб їх розміряти.

## Out of scope

- Підсумок після закриття тренування з головної — та кнопка для кинутих тренувань, лишається тихою.
- Тренування без підходів — сервер видаляє його при `finish`, підсумку нема чого показувати.
- Розрахунковий 1RM і рекорди на кількість повторів — рекорд тут лише максимальна вага; 1RM належить екрану «Вправа детально».
- Порівняння загального обʼєму з минулим таким самим днем — порівняння йде лише по вправі.
- Екрани «Історія», «Минуле тренування», «Прогрес» — окремі екрани брифу; ця фіча лише закладає для них визначення.
- Редагування часу чи підходів після завершення — не передбачене брифом.

## Open decisions

| # | Question | Type | Owner | Blocks |
|---|---|:---:|:---:|:---:|
| D1 | Чи порівнюються ріст і рекорди лише з тренуваннями, що завершилися раніше за показуване (а не з усією історією)? | grilling | human | 2 |
| D2 | Підсумок рахується на льоту з `workout_sets` чи зберігається при `finish` (backlog «Статистика»)? | grilling | human | 1 |

## Decisions so far

- Чотири метрики (обʼєм, тривалість, ріст, рекорди), порівняння по реально виконаній вправі → [`docs/idea-brief.md` §7](idea-brief.md)
- Підходи з 0 повторів не враховуються ні в робочій вазі, ні в рекордах → [`docs/idea-brief.md` §6](idea-brief.md)
- Тривалість = `finishedAt − startedAt`, ризик роздутого часу прийнято → [`docs/idea-brief.md` §6](idea-brief.md)
- Ріст і рекорди — один крок: спільне визначення «попередніх тренувань» і один рядок вправи → ця сесія roadmap
- Виконання строго послідовне: усі кроки в `backend/src/workouts/` і на одній сторінці підсумку → ця сесія roadmap

## Dependency graph

```mermaid
flowchart LR
  s1["1 · Підсумок: обʼєм + час"] -->|ендпоінт підсумку і сторінка, які крок 2 розширює| s2["2 · Ріст і рекорди"]
  s2 -->|та сама сторінка, анімація розкриває ріст і рекорди| s3["3 · Анімація нагороди"]
```

## Execution path

| Wave | Steps | Zone per step (why parallel-safe) | Unlocks |
|:---:|---|---|---|
| 1 | 1 | 1: `backend/src/workouts/` + `frontend/src/lib/api/` + `frontend/src/app/(protected)/workout/` (маршрут підсумку — (new)) | 2 |
| 2 | 2 | 2: `backend/src/workouts/` + сторінка підсумку (new) — та сама зона, що й 1, тому окрема хвиля | 3 |
| 3 | 3 | 3: сторінка підсумку (new) + `frontend/src/app/globals.css` (keyframes) | — |

## Shipped

| Step | Shipped | Link |
|---|---|---|
