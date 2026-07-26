# Session coordination

Two Claude Code sessions are building this repo in parallel. This file is the shared contract so we don't clobber each other. **Read it before large edits; keep it current.**

## Ownership (edit only your lane)

**Session A — Career OS foundation** (`src/lib/`)
- `domain.ts`, `animals.ts`, `matching.ts`, `role-context.tsx`, `mock-data.ts`
- The three-audience model (candidate / employer / university), the 12-Animals archetypes, the weighted matching engine, and turning sample data into real data.
- Owns **the data layer becoming real** (mock-data → Convex).

**Session B — Backend + live screens** (`convex/`, `app/`, `src/screens/`, `src/components/`, `tests/`, config)
- Convex **auth** (`convex/auth.ts`, `convex/users.ts`, `convex/schema.ts` auth tables), `middleware.ts`, `app/` routing.
- The live screens (Marketplace, TrackBuilder, ApplicantReview, Mentees, MatchReport, StudentMentorship, StudentAssessment, RecruiterDashboard, Login) and their tests.
- Builds **on** Session A's foundation: imports `src/lib/domain.ts` types + `matching.ts`; never edits `src/lib`.

## Shared contract
- **Roles:** Convex `users.role` and routes stay `student` | `recruiter` (`LegacyRole`). Map to the 3-audience `Role` via `domain.ts` `fromLegacyRole` / `toLegacyRole`. Adding the `university` audience is a coordinated change.
- **Convex schema is the integration point.** Its tables should mirror `domain.ts` types. Only one session edits `convex/schema.ts` at a time — coordinate before adding data tables (candidates, tracks, cohorts, applications) so we don't both define them.

## Git protocol
- `git pull --rebase origin main` **before** every push.
- **Never `git add -A`** — stage only your lane's paths, so you don't sweep the other session's in-flight files. (This already happened once: `bca65ac` swept Session A's WIP.)
- One feature per commit, plain messages ("Added …", "Wired …"). Push small and often.

## Status
- Live on `main`: Next migration, test suite, flexible duration, Convex client, **auth**, marketplace tracks + logos (Session B). Foundation files committed in `bca65ac` (Session A's WIP).
- **Open coordination item:** who owns the Convex data layer for candidates/tracks/cohorts as Session A makes mock-data real — Session B has already built `organizations` + `tracks` tables + seed. Decide before either adds more data tables.
