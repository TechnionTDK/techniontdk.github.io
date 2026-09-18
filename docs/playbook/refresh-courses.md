# Refresh the courses page

Triggers: add a course, add the advanced course, new course for the semester, update the courses
page, who teaches what now, is the courses page current, courses this semester
Updated: 2026-09-18

## Ask first
- **A course nobody in the lab coordinates — does it stay?** The Technion registry may hand the
  course to someone outside the lab, or the entry may be years old. Only the manager knows whether
  it still belongs on the lab's page.
- **A course taught by lab *staff*, outside the lab's topics — does it count?** It did not in
  September 2026 (Android Development, taught by Oren Mishali).

Fields, slugs and formats come from `content/SCHEMA.md`. Do not ask about those.

## Settled
- **2026-09-18 — `instructors` names lab members only, by slug.** A course coordinated from
  outside the lab omits the field and shows no instructor; never write a name as text, because the
  person's name and honorific live in `content/people/` (rule 2).
- **2026-09-18 — a course taught under an umbrella number gets no `number`.** Seminar in Computer
  Science *N*, Advanced Topics in Computer Science *N* and the project courses carry a different
  topic each semester, so there is no catalogue entry to cite or link. `npm run validate` warns
  about the missing number; that is the expected state, not a defect to fix.
- **2026-09-18 — a course that moves from an umbrella number to a permanent one is one file.**
  236028 superseded Benny Kimelfeld's 236605 run of the same course, and 236605 is not listed
  separately.
- **2026-09-17 — historical entries stay.** A course keeps its place on the page even when no
  current lab member coordinates it; the manager decides removals, not the sweep.
- **2026-09-18 — ordering is derived, not stored.** Courses group by their first instructor in the
  people-page order, then by `number`. There is no `order` field to maintain.

## Steps
1. **Get the real data.** `https://www.cs.technion.ac.il/courses/` renders its table from
   JavaScript, so there is nothing to read in the HTML. The data is:

   ```
   curl -s -X POST https://www.cs.technion.ac.il/courses/myresponse.php \
     --data "semesterID=<n>&englishOnly=0&start=0&length=2000&draw=1"
   ```

   Semester IDs come from the `semesterFilter` select on that page (31 = Winter 2026-2027, counting
   back one per semester); `semesterID=all` gets every semester at once. If the endpoint moves,
   re-read `https://www.cs.technion.ac.il/js/cs-courses.min.js` for the current one.
2. **Match on full names.** Compare each course's `responsible` against `name:` in
   `content/people/*.md` using **first and last name**. Surname-only matching produced five false
   positives in September 2026 — Friedman, Cohen, Mizrahi, Eldar and Mor are all common Technion
   surnames belonging to people outside the lab.
3. **Confirm each course in the catalogue.** `https://students.technion.ac.il/local/technionsearch/course/<number>?lang=en`
   gives the official English title and syllabus. Use the catalogue's title so title and `number`
   agree — this is what renamed "Database Management Systems" to "Databases" (236363).
4. **Write one file per course** in `content/courses/`, body = the syllabus condensed to a sentence
   or two in the site's voice. `url` is the course's own site when it has one (richer than the
   catalogue), otherwise the catalogue page.

## The caveat that prevents a wrong conclusion
The faculty system names only **one** responsible person per course. A lab member who co-teaches
without coordinating does not appear in the sweep, so absence is never proof that someone does not
teach a course. Add them to `instructors` when you know from elsewhere.

The sweep also reaches back only a few years — Winter 2024-2025 at the time of writing. A course
last taught before that shows up nowhere, which is why step 3 goes to the catalogue rather than
trusting the sweep alone.

## Check
- `npm run validate` — must pass. Courses with no instructor or no number warn; read those as the
  list to raise with the manager, not as errors to silence.
- `npm run build && npm run linkcheck` — after any generator or template change.

## Worked example
September 2026, from "add the advanced course" to a rebuilt page: the sweep found Brit Youngmann's
three courses missing entirely and Benny Kimelfeld's new 236028 superseding his 236605 run, and the
courses page stopped being prose — `content/courses/` became a real content type so the instructor
could be a cross-reference to `content/people/` instead of a name typed twice.
