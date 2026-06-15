import { useState, type ComponentType } from 'react'
import Login, { type Role } from './screens/Login'
import Marketplace from './screens/Marketplace'
import StudentMentorship from './screens/StudentMentorship'
import StudentAssessment from './screens/StudentAssessment'
import RecruiterDashboard from './screens/RecruiterDashboard'
import TrackBuilder from './screens/TrackBuilder'
import ApplicantReview from './screens/ApplicantReview'
import Mentees from './screens/Mentees'
import MatchReport from './screens/MatchReport'
import { Logo, TalentbankLogo } from './components/ui'

type NavProps = { onNavigate?: (id: string) => void }
type Tab = { id: string; label: string; Component: ComponentType<NavProps> }

const STUDENT_TABS: Tab[] = [
  { id: 'marketplace', label: 'Marketplace', Component: Marketplace },
  { id: 'mentorship', label: 'My Mentorship', Component: StudentMentorship },
  { id: 'assessment', label: 'AI Assessment', Component: StudentAssessment },
]

const RECRUITER_TABS: Tab[] = [
  { id: 'dashboard', label: 'Dashboard', Component: RecruiterDashboard },
  { id: 'new-track', label: 'New Track', Component: TrackBuilder },
  { id: 'applicants', label: 'Applicants', Component: ApplicantReview },
  { id: 'mentees', label: 'Mentees', Component: Mentees },
  { id: 'assessment', label: 'AI Assessment', Component: MatchReport },
]

const PROFILE: Record<Role, { name: string; sub: string; initials: string }> = {
  student: { name: 'John Doe', sub: 'Sunway University', initials: 'JD' },
  recruiter: { name: 'Talentbank', sub: 'Talent Team', initials: 'TB' },
}

export default function App() {
  const [role, setRole] = useState<Role | null>(null)
  const [tab, setTab] = useState(0)

  if (!role) {
    return (
      <Login
        onSelect={(r) => {
          setRole(r)
          setTab(0)
        }}
      />
    )
  }

  const tabs = role === 'student' ? STUDENT_TABS : RECRUITER_TABS
  const safeTab = Math.min(tab, tabs.length - 1)
  const Active = tabs[safeTab].Component
  const profile = PROFILE[role]

  const navigate = (id: string): void => {
    const i = tabs.findIndex((t) => t.id === id)
    if (i >= 0) setTab(i)
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 border-b border-line bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3">
          <div className="flex items-center gap-3">
            <Logo className="h-9 w-9 text-gold" />
            <div className="leading-none">
              <div className="text-base font-black tracking-tight text-ink">CAPSTONED</div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                {role === 'student' ? 'Student Workspace' : 'Recruiter Workspace'}
              </div>
            </div>
          </div>

          <nav className="hidden items-center gap-1.5 lg:flex">
            {tabs.map((t, i) => (
              <button
                key={t.id}
                onClick={() => setTab(i)}
                className={`border px-3.5 py-2 text-[13px] font-semibold rounded-[2px] transition-colors duration-150 ${
                  i === safeTab
                    ? 'border-ink bg-ink text-cream'
                    : 'border-line text-ink-soft hover:border-ink/40 hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {role === 'recruiter' ? (
              <span className="hidden sm:inline-flex">
                <TalentbankLogo className="text-[12px]" />
              </span>
            ) : (
              <>
                <div className="hidden text-right sm:block">
                  <div className="text-[13px] font-bold leading-tight text-ink">{profile.name}</div>
                  <div className="text-[11px] text-ink-faint">{profile.sub}</div>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-[2px] border border-line-strong bg-paper text-xs font-bold text-ink">
                  {profile.initials}
                </div>
              </>
            )}
            <button
              onClick={() => {
                setRole(null)
                setTab(0)
              }}
              className="border border-line px-3 py-2 text-xs font-semibold text-ink-soft rounded-[2px] transition-colors hover:border-ink hover:text-ink"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* compact nav for small screens */}
        <div className="flex gap-1.5 overflow-x-auto border-t border-line px-4 py-2 lg:hidden">
          {tabs.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setTab(i)}
              className={`whitespace-nowrap border px-3 py-1.5 text-xs font-semibold rounded-[2px] transition-colors ${
                i === safeTab ? 'border-ink bg-ink text-cream' : 'border-line text-ink-soft'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main>
        <Active onNavigate={navigate} />
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 text-xs text-ink-faint">
          <span>CapStoned — mentorship that starts years before graduation.</span>
          <span className="hidden sm:inline">{profile.name} · {tabs[safeTab].label}</span>
        </div>
      </footer>
    </div>
  )
}
