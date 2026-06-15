# CapStoned

**A Proactive Mentorship Marketplace** — mentorship that starts years before graduation.

CapStoned connects students and companies through structured, calendar-aligned mentorship tracks.
Companies design milestone-driven programs; students browse a transparent marketplace with live
applicant counts and guaranteed-interview windows; both sides get an AI assessment of the match.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm run build      # production build (Vite)
npm run preview    # serve the production build
npm run typecheck  # tsc --noEmit (strict)
```

## Using the prototype

You start on a **mocked login/register** screen — any credentials work. Pick a role to load that
experience (you can sign out from the header to switch roles):

### Student
- **Marketplace** — browse mentorship tracks and apply, with live seats (`45/50`) and guaranteed
  interview windows.
- **My Mentorship** — your ongoing track: weekly progress, tasks with a working "submit deliverable"
  flow, and mentor feedback from Wei Chen.
- **AI Assessment** — your interim (Week 8 of 12) assessment: competency scores, strengths, where to
  grow, and forward options (continue, request a call, or step away).

### Recruiter
- **Dashboard** — all your mentorship programs with status, applicant fill, and enrolled counts;
  filterable by state.
- **New Track** — a 3-step wizard to design a program: basics → commitment & schedule → deliverables
  and weighted AI checkpoints, with a live marketplace preview.
- **Applicants** — a sortable review table with verified students, AI match potential, per-row
  interview-window countdowns, and reversible accept/decline.
- **Mentees** — enrolled mentees and their ongoing tasks in a master-detail view; send feedback or a
  message.
- **AI Assessment** — the interim AI report on a mentee, with extend / terminate / early-offer
  actions (terminate requires a reason and previews the reliability impact).

All data is realistic inline mock data; all interactivity is real client-side state.

## Design system

Premium corporate incubator: **cream** surfaces, sharp **charcoal** ink, muted **gold** + **slate**
accents, **danger red** for urgency. Sharp 2px corners, crisp 1px borders, no heavy shadows. Inter
typeface. The brand mark is a stylized cannabis leaf.

Tokens live in [src/index.css](src/index.css) (Tailwind v4 `@theme`); shared primitives
(`Button`, `Badge`, `Card`, `ProgressBar`, `Field/Input`, `StatBar`, `ReliabilityScore`, `Page`,
`Logo`) live in [src/components/ui.tsx](src/components/ui.tsx).

## Stack

Vite 6 · React 18 · TypeScript (strict) · Tailwind CSS v4.

```
src/
  App.tsx                    # auth gate + role-based workspace shell & nav
  index.css                  # design tokens + base styles
  components/ui.tsx          # shared primitives + Logo (cannabis leaf)
  screens/
    Login.tsx                # role selection
    Marketplace.tsx          # student
    StudentMentorship.tsx    # student
    StudentAssessment.tsx    # student
    RecruiterDashboard.tsx   # recruiter
    TrackBuilder.tsx         # recruiter
    ApplicantReview.tsx      # recruiter
    Mentees.tsx              # recruiter
    MatchReport.tsx          # recruiter (AI assessment)
```
