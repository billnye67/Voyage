# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Voyage — a prototype homeschool learning site for kids (Grade 4 only so far). Pure static HTML: every page is a single self-contained file with inline CSS and JS. No build system, no package.json, no framework, no tests. All state lives in browser localStorage; there is no backend — the only network calls are Google Fonts and the tutor widget's Cloudflare Worker.

To run: open any page in a browser, or serve the folder statically (e.g. `python -m http.server`). Verify changes by clicking through the page.

## Page flow

`index.html` (marketing) → `account.html` (family account + kid roster, localStorage-only auth) → `home.html` (kid dashboard, redirects to account.html if not logged in) → four course pages (`math-course.html`, `ela-course.html`, `science-course.html`, `social-studies-course.html`) and project pages (`project-*.html`). `lesson-*.html` are standalone math lessons launched from math-course.html.

`tutor-widget.js` is a drop-in floating AI tutor added via `<script src="tutor-widget.js"></script>` before `</body>`; `callTutor()` posts Anthropic-style messages to a Cloudflare Worker (swap its body to change endpoints).

## Course engine (course pages)

Each course page holds a `COURSE` data object (domains → skills → cards tagged Learn / Example / Practice / Prove it) plus a card-player engine that is **copy-pasted across the four course files** — an engine fix must be applied to each one, and they have drifted (math-course.html is the most evolved). Practice cards use `GEN` generator functions for endless problems; mastery = 8 correct in a row (`MASTER_GOAL`), which calls `markSkillDone()` and unlocks the Next button.

math-course.html additionally has a `LESSONS` map (standard code → lesson file + blurb/goal/mins). Skills in that map bypass the card player: the sidebar marks them with ◆ and `loadSkill()` renders an intro card whose "Start lesson" navigates to the standalone lesson page. All 28 math skills now have lesson pages.

## Lesson pages (lesson-*.html)

Filename pattern: `lesson-<standard><n>-<slug>.html` (lesson-4nbt5-multiplication.html teaches 4.NBT.5). Every lesson follows the same skeleton — model new ones on a recently committed lesson:

- Intro card → `render()` state machine over `step` (0..TOTAL-1): interactive challenge beats first (build/manipulate something), then explanation / predict-first / catch-the-mistake beats, then 5 multiple-choice `QUESTIONS`, then a done screen.
- Question screens include a "← Review the lesson" button (`reviewLesson()`).
- Scoring ≥80% (4/5) calls `markCourseDone()`, which writes `done['<CODE>']=true` into `voyage_g4math_progress_<kidId>`.
- Done screen credits Illustrative Mathematics (CC BY 4.0) where task design is based on IM.

To add a lesson: create the file, add its entry to `LESSONS` in math-course.html, and make sure `markCourseDone()` writes the exact standard code used in math-course.html's `COURSE` data.

## localStorage schema (the cross-file contract)

- `voyage_account` — `{parentName, email, pass, kids:[{id,name,grade}], activeKidId, loggedIn}`; written by account.html, checked as a guard in home.html.
- `voyage_g4math_progress_<kidId>` — `{done:{'4.NBT.5':true,…}, lastSkill}`; kidId falls back to `'solo'` when no account exists.
- `voyage_project_<id>` (e.g. `voyage_project_plane_g4`) — `{done:{milestoneId:true}}`.
- **Two key generations coexist.** Per-kid suffixing exists only in the math path (math-course.html + lesson pages). The ELA/science/social-studies courses use un-suffixed keys (`voyage_g4ela_progress`, …), and home.html's dashboard tiles and tutor-widget.js also read the un-suffixed keys (tutor-widget.js additionally reads a legacy `voyage_profile`). Check which generation a file uses before touching progress code.
- Done-keys differ by subject: math keys progress by standard code (`4.OA.1`); ELA keys it by skill **title**.
- home.html hard-codes each subject/project total (`total: 28`, etc.) — update these if skill counts change.

## Design language

Every page shares the same hand-rolled "drafting paper" look. New pages copy the existing tokens rather than inventing styles:

- CSS vars: `--paper:#f3f0e6 --ink:#16233a --blue:#1b4f8a --blue-line:#b9cbdf --accent:#f0663f --muted:#5d6b7e --card:#fbfaf5 --green:#2e7d5b`, plus the blue grid-line background.
- Fonts (Google Fonts): Fraunces (headings), Space Grotesk (body), Space Mono (labels/kickers — uppercase, letter-spaced).
- Buttons use a hard offset shadow (`3px 3px 0 var(--ink)`) that collapses on `:active` (translate + shadow 0).
