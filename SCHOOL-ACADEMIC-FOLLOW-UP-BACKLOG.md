# School and Academic Follow-up Backlog

**Reviewed:** 2026-11-23
**Scope:** Finalized school requirements following Phase 2. This backlog does not authorize database or production changes.

## Required

### Academic-term date boundaries

- Add start and end dates to academic terms only after confirming the school's date/calendar rules.
- Define whether terms within a year may overlap, how a boundary equal to another term's boundary is treated, and whether dates may fall outside the academic-year range.
- Validate the same rules in the API and UI; reject invalid or reversed ranges without writes.
- Plan a backward-compatible migration and a deliberate data/backfill approach for existing terms. Do not invent dates for historical terms or alter exam/mark records.
- Add focused tests for valid boundaries, reversed ranges, duplicate/overlapping ranges according to the confirmed policy, missing values during migration, and existing exam relations.
- Keep implementation outside Phase 3 unless student management is shown to depend directly on term boundaries.

### Multiple teacher/class/subject assignments

- Preserve the required ability for a teacher to serve multiple subjects and classes in an academic year, and for valid assignments to be independently represented.
- Prevent an exact duplicate `(teacher, class, subject, academic year)` while allowing distinct assignments.
- Require the subject to be configured for the selected class and academic year.
- Current evidence: `TeacherAssignment` has the corresponding compound uniqueness constraint; the POST API checks for a matching `ClassSubject` and an existing exact assignment; the UI adds and displays independent assignments.
- Phase 3 regression-tested multiple subjects/classes, distinct assignments, exact duplicates, and missing class-subject relationships. Do not alter existing fixture assignments.
- The current API looks up teacher, class, subject, academic year, and class-subject independently. Cross-school consistency is not enforced by those lookups; assess this separately before expanding school-scoping behavior.
- Add a focused negative test and require the teacher, class, and academic year to belong to the same school before creating an assignment.

### Deterministic school context across dashboard and APIs

- Phase 3 browser evidence showed `/dashboard` displaying the separate `BILL_QA_2083 Test School` while student pages and APIs used the primary QA school. Source review found an unordered `prisma.school.findFirst()` in `src/app/dashboard/page.tsx`.
- Remediation task: use the same deterministic primary-school selector as the scoped APIs, then test dashboard statistics and student/API results with both schools present. This is a separate cross-school scoping fix; it was not changed during Phase 3.
- Treat the mismatch as a deployment blocker for multi-school configurations until corrected and retested. See [QA-PHASE3-STUDENT-REPORT.md](./QA-PHASE3-STUDENT-REPORT.md).

## Desirable, lower priority

### Teacher, class, and subject activation

- Consider active/inactive lifecycle controls for teachers, classes, and subjects.
- Current models and management UI do not expose activation fields or controls.
- Define how deactivation affects historical assignments, enrollments, exams, and reports before implementation. Prefer preserving existing relations and records; do not silently cascade-delete history.
- Do not block Phase 3 on this feature.

### Exceptional academic-year correction

- Routine year editing is **not required** and no edit UI/API currently exists.
- If an exceptional correction mechanism is later needed, inventory terms, enrollments, fee structures, assignments, and exams first; reject unsafe changes with dependents unless the authorized correction path explicitly preserves history and provides an audit record.
- Do not use direct database edits as a routine substitute for a reviewed correction workflow.

## Not required

### Operational sections

- The school does not require section management or section selection during student enrollment.
- Do not add section CRUD, selectors, or requirements to the student workflow.
- Preserve existing Section rows and section-linked Enrollment history.

## Existing implementation limitation and safe cleanup assessment

Source review found that student UI/API code does not reference `sectionId` and there is no `/api/sections` route. The remaining explicit source/schema dependencies are:

- `Enrollment.sectionId` is nullable and has a foreign-key relation and index.
- `Section` remains a Prisma model with a school relation.
- `prisma/seed.ts`, `prisma/seed-results.ts`, and `scripts/qa/reset-and-seed.ts` still create or use section-linked records.
- Generated Prisma files reflect the schema and must not be edited by hand.

This makes section selection unnecessary for current enrollment workflows, but does **not** make historical schema/data removal safe by itself. A future cleanup proposal should:

1. Read-only inventory all sections and linked enrollments in each target environment.
2. Confirm retention and reporting requirements for historical class/section associations.
3. Decide whether to retain the nullable schema for compatibility or remove it through an approved migration after preserving required history.
4. Update seed/reset scripts and tests consistently with the approved direction.
5. Validate migration behavior on an isolated copy and verify enrollment, exam, and reporting relations before any authorized rollout.

No section/schema cleanup is part of Phase 3, and no data or schema changes have been made for this backlog.

## Other preserved future requirements

- Preserve the approved future ADMIN/ACCOUNTANT permission specification and comprehensive non-ADMIN authorization audit in [QA-TEST-INVENTORY.md](./QA-TEST-INVENTORY.md).
- In-app password change/reset/recovery remains an existing implementation limitation. It is not part of Phase 3.
- Production readiness, deployment, backup/restore, and recovery rehearsal remain separate, untested work.
