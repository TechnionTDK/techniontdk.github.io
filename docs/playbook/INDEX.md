# Playbook index

Recipes for **content update tasks** — the things the lab manager asks for in plain language:
add these papers, add a new member, write up this event, add a guide.

The playbook starts empty and is written as real tasks come in. A recipe is recorded only
after a task has actually been done once, so it describes what was really decided and run,
not what someone imagined in advance.

**Read this index first, and only this index.** It is one line per recipe, so it stays cheap
to load however large the playbook grows. Open a recipe file only when its line matches the
task at hand. To search by keyword instead of scanning: `grep -ril "<word>" docs/playbook/`.

## Recipes

- [add-accepted-papers](add-accepted-papers.md) — file an accepted/published paper and announce it. Triggers: paper accepted, we got a paper into, add these papers, announce the acceptance, N papers accepted to, published in journal.
- [add-news-item](add-news-item.md) — write up anything that happened as a news item. Triggers: add a news item, add a new item, write up this event, we just had a visit, a talk by, we hosted, X gave a talk, add this to the news.
- [refresh-courses](refresh-courses.md) — re-derive the whole courses page from the faculty registry for the current semester and the three before it. Triggers: add a course, add the advanced course, new course for the semester, update the courses page, who teaches what now, is the courses page current, courses this semester, which semesters, remove old courses.

<!-- One line per recipe, alphabetical by slug. Format:
- [slug](slug.md) — what the task does. Triggers: phrase, phrase, phrase.
Keep it to one line: the triggers are what makes a match possible without opening the file,
so list the words the manager actually uses, not a summary of the steps. -->

## When there is no matching recipe

Do not guess a convention that isn't in `content/SCHEMA.md`. Ask the manager the questions
the task leaves open — the judgment calls, not the mechanics — then do the work. Whether it
also becomes a recipe is the manager's call, not yours: propose one in a line and write it
only if they agree. See the protocol in `CLAUDE.md` ("Content update tasks").

## Recipe file format

`docs/playbook/<slug>.md`, where `<slug>` is lowercase-kebab and names the task, not the
content type: `add-accepted-papers.md`, not `publications.md`. Keep a recipe to one screen —
if it grows past that, it is probably two tasks.

```markdown
# <Task name>

Triggers: <the phrasings the manager uses>
Updated: YYYY-MM-DD

## Ask first
- <question> — only what the manager must decide and cannot be inferred from the request.
  Omit the section when the task needs nothing beyond what they always say.

## Settled
- <a policy decision, and the date it was made> — so it is never re-asked.

## Steps
1. <imperative step, with the exact command where there is one>

## Check
- <what proves it worked; `npm run validate` at minimum>
```

Record only what the schema does not already say. A recipe carries the *judgment* —
which field gets which value here and why, what to ask, what order to do things in.
Field-by-field rules stay in `content/SCHEMA.md`, and a recipe should link to it rather
than repeat it, so the two never disagree.

## Keeping recipes true

Update the existing recipe rather than adding a second one for the same task: when the
manager corrects a step, settles a question the recipe still asks, or works through a
variant, fold it in and bump `Updated`. A recipe that turns out to be wrong is deleted,
along with its index line.
