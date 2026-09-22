# Refresh the courses page

Triggers: add a course, add the advanced course, new course for the semester, update the courses
page, who teaches what now, is the courses page current, courses this semester, which semesters,
remove old courses
Updated: 2026-09-22

The page covers a moving window: the current semester and the **three** before it. Everything
on it is re-derived from the faculty registry each time; nothing survives because it used to be
there. A course is listed once per *run*, so the same course appears again each semester it runs.

## Ask first
- **Is a newly found course on-topic for the lab?** A lab member coordinating something outside
  the lab's subject does not put it on the lab's page — the Android Development test below.
  This is the only question the sweep cannot answer.

Fields, slugs and formats come from `content/SCHEMA.md`. Do not ask about those.

## Settled
- **2026-09-22 — which runs are listed.** A course qualifies if a lab member is the responsible
  lecturer on at least one run in the window. Then list every run a lab member gives, **plus**
  the current semester's run whoever gives it. A *past* run under an outsider is dropped. This is
  why Databases keeps its Spring 2026 (Brit Youngmann) and Winter 2026-2027 (Hagit Attiya) runs
  but not its Winter 2025-2026 (Hagit Attiya) one.
- **2026-09-22 — a run the registry does not attribute.** Data Management Algorithms for Decision
  has no responsible lecturer in Winter 2026-2027; it is listed as Brit Youngmann's. That is a
  fact about this course, not a rule — ask about any other unattributed run.
- **2026-09-22 — numbers are the 8-digit form**, copied verbatim from the sweep's
  `course_number8` (the registry's *Number* column): `"02360028"`, never `236028`. Quote it.
- **2026-09-22 — Data Management Algorithms for Decision is `"02360771"` by hand.** The registry
  and the catalogue both still say `02360003`, and `02360771` resolves to no catalogue page. A
  refresh must **not** overwrite it with what the sweep reports. Its run links keep `02360003`.
- **2026-09-22 — Android Development (`02360271`, `02360272`) stays out.** Lab staff teaching
  outside the lab's topics does not put a course on the lab page. Decided September 2026, held.
- **2026-09-22 — link precedence per run:** the course's own site if it has one → the row's
  *Faculty Course Page* (`url` in the JSON) → the row's *Technion Course Page* (built from
  `year_id`, `semester_code` and `course_number8`, see step 4).
- **2026-09-22 — an umbrella-number run cites its own number.** `02360605` Advanced Topics in
  Computer Science 5 is its own file even though it is the same course as `02360028`: entries are
  per run, so each catalogue entry stands on its own. (This reverses the September 2026 rule that
  folded the two into one file.)

## Steps
1. **Read the window off the page.** `https://www.cs.technion.ac.il/courses/` — the
   `semesterFilter` select lists the semesters and the *selected* option is the current one
   (31 = Winter 2026-2027 on 2026-09-22, counting back one per semester). Take it and the three
   below it. Note the "Current Semester" line on that page says something else — it names the
   semester in progress, not the one being registered for; the selected option is what we use.
2. **Get the real data.** The table is rendered from JavaScript, so there is nothing in the HTML:

   ```
   curl -s -X POST https://www.cs.technion.ac.il/courses/myresponse.php \
     --data "semesterID=<n>&englishOnly=0&start=0&length=2000&draw=1"
   ```

   If the endpoint moves, re-read `https://www.cs.technion.ac.il/js/cs-courses.min.js`.
3. **Match on full names.** Compare each row's `responsible` against `name:` in
   `content/people/*.md` using **first and last name**. Surname-only matching produced five false
   positives in September 2026 — Friedman, Cohen, Mizrahi, Eldar and Mor are all common Technion
   surnames belonging to people outside the lab. (Tal Mizrahi is not Hila Mizrahi.)
4. **Build the run list** by the rule under *Settled*. Each run's link is `url` from its row;
   when that is empty, build the Technion course page instead:
   `https://portalex.technion.ac.il/ovv/?sap-theme=sap_belize&sap-language=EN&sap-ui-language=EN#/details/<year_id>/<semester_code>/SM/<course_number8>`.
5. **Rewrite `content/`.** Set `course_semesters` in `content/site.yaml` (newest first), write one
   file per course in `content/courses/` with its `runs`, and **delete every course left with no
   run**. Body = the syllabus condensed to a sentence or two in the site's voice.

## The caveat that prevents a wrong conclusion
The registry names only **one** responsible person per course per semester. A lab member who
co-teaches without coordinating does not appear in the sweep, so absence is never proof that
someone does not teach a course. Add them to that run's `instructors` when you know from elsewhere.

`webcourse_source: "redirect"` means the row's link points at *another* semester's page, so the
link is not evidence that the course runs this semester under that lecturer. `responsible` decides.

## Check
- `npm run validate` — must pass. A "no run given by a lab member" warning is the list to raise
  with the manager, not an error to silence.
- `npm run build && npm run linkcheck` — after any generator or template change.
- Re-run step 2 and confirm it reproduces the runs now on the page. The recipe is only true if it does.

## Worked example
September 2026: the window rule cut the page from ten courses to seven runs of five courses.
`content/courses/` gained a `runs:` list so Databases could appear twice — Brit Youngmann in
Spring 2026, Hagit Attiya in the current semester — and six courses with no run in the window
were deleted, including Oded Shmueli's 02360510 and both seminars.
