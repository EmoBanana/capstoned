'use client'

import { useState } from 'react'
import { Button } from './ui'

/* ------------------------------------------------------------------ */
/*  Micro-Bond Sponsorship Agreement — a real contract the student      */
/*  reviews and virtually signs. Shared by the student (sign flow) and   */
/*  the recruiter (view executed). Prints/saves a clean PDF.             */
/* ------------------------------------------------------------------ */

export type ContractSponsorship = {
  id: string
  orgName: string
  title: string
  type: 'milestone' | 'period'
  amount: number
  commitmentKind: 'contract' | 'priority-hiring'
  commitmentMonths: number
  status: string
  createdAt: number
  contractNo: string | null
  signedName: string | null
  signedAt: number | null
}

const money = (n: number) => `RM ${n.toLocaleString('en-MY')}`
const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

function commitmentClause(s: ContractSponsorship) {
  return s.commitmentKind === 'contract'
    ? `a ${s.commitmentMonths}-month employment contract with ${s.orgName}, to commence upon the Candidate's successful completion of the Track`
    : `priority hiring consideration at ${s.orgName} for a period of ${s.commitmentMonths} months following the Candidate's completion of the Track`
}
function disbursementClause(s: ContractSponsorship) {
  return s.type === 'milestone'
    ? 'disbursed upon verified completion of the agreed milestone deliverable'
    : `disbursed across the ${s.commitmentMonths}-month sponsorship period`
}

/** Clause list — plain data so it renders identically on-screen and in print. */
function clauses(s: ContractSponsorship, studentName: string, trackTitle: string) {
  return [
    ['Sponsorship', `The Sponsor shall provide the Candidate a micro-bond of ${money(s.amount)} ("the Sponsorship"), ${disbursementClause(s)}.`],
    ['Purpose', `The Sponsorship supports the Candidate's participation in the "${trackTitle}" mentorship track ("the Track").`],
    ['Commitment', `In consideration of the Sponsorship, the Candidate agrees to ${commitmentClause(s)}.`],
    ['Good faith', 'Both parties shall act in good faith. The Candidate shall maintain active participation in the Track; the Sponsor shall honour the Sponsorship and the commitment above.'],
    ['Reliability', "This agreement is recorded on CapStoned and reflected in both parties' reliability scores. Failure to honour it without justified cause may reduce the defaulting party's score."],
    ['Termination', 'Either party may terminate for justified cause (e.g. withdrawal from the Track) with written notice. Sponsorship already disbursed for completed milestones is non-refundable.'],
  ] as const
}

function buildContractHtml(s: ContractSponsorship, studentName: string, trackTitle: string) {
  const rows = clauses(s, studentName, trackTitle)
    .map(([h, b], i) => `<li><b>${i + 1}. ${h}.</b> ${b}</li>`)
    .join('')
  const signed = s.signedName && s.signedAt
  return `<!doctype html><html><head><meta charset="utf-8"><title>${s.contractNo ?? 'Micro-Bond Agreement'}</title>
  <style>
    *{box-sizing:border-box} body{font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;max-width:720px;margin:40px auto;padding:0 32px;line-height:1.55}
    h1{font-size:20px;letter-spacing:.02em;margin:0} .sub{color:#666;font-size:12px;text-transform:uppercase;letter-spacing:.14em;margin-top:6px}
    .meta{display:flex;justify-content:space-between;font-size:12px;color:#444;border-top:1px solid #ddd;border-bottom:1px solid #ddd;padding:10px 0;margin:20px 0}
    ol{padding-left:0;list-style:none} li{margin:12px 0;font-size:14px} .parties{font-size:14px;margin:16px 0}
    .sig{display:flex;justify-content:space-between;gap:40px;margin-top:48px}
    .sig div{flex:1} .line{border-top:1px solid #333;margin-top:40px;padding-top:6px;font-size:12px;color:#555}
    .ink{font-family:'Snell Roundhand','Segoe Script',cursive;font-size:24px;color:#0a2540}
    .stamp{margin-top:28px;font-size:12px;color:#0a7d3c;border:1px solid #0a7d3c;display:inline-block;padding:4px 10px;border-radius:3px}
  </style></head><body>
  <h1>MICRO-BOND SPONSORSHIP AGREEMENT</h1>
  <div class="sub">${s.title}</div>
  <div class="meta"><span>Contract No: ${s.contractNo ?? '—'}</span><span>Offered: ${fmtDate(s.createdAt)}</span></div>
  <p class="parties">This Agreement is made between <b>${s.orgName}</b> ("the Sponsor") and <b>${studentName}</b> ("the Candidate").</p>
  <ol>${rows}</ol>
  <div class="sig">
    <div><div class="ink">${signed ? s.signedName : ''}</div><div class="line">Candidate — ${studentName}${signed ? ` · Signed ${fmtDate(s.signedAt!)}` : ''}</div></div>
    <div><div class="ink">${s.orgName}</div><div class="line">For and on behalf of the Sponsor</div></div>
  </div>
  ${signed ? `<div class="stamp">✓ EXECUTED · ${s.contractNo}</div>` : ''}
  </body></html>`
}

export default function MicroBondContract({
  sponsorship,
  studentName,
  trackTitle,
  signing = false,
  error = null,
  onSign,
  onDecline,
  onClose,
}: {
  sponsorship: ContractSponsorship
  studentName: string
  trackTitle: string
  signing?: boolean
  error?: string | null
  onSign?: (name: string) => void
  onDecline?: () => void
  onClose: () => void
}) {
  const s = sponsorship
  const executed = s.status === 'signed' || s.status === 'accepted'
  const canSign = !executed && !!onSign
  const [name, setName] = useState('')
  const [agree, setAgree] = useState(false)
  const rows = clauses(s, studentName, trackTitle)

  const print = () => {
    const w = window.open('', '_blank', 'width=800,height=900')
    if (!w) return
    w.document.write(buildContractHtml(s, studentName, trackTitle))
    w.document.close()
    w.focus()
    w.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden border border-line-strong bg-cream rounded-t-[6px] sm:rounded-[4px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
              {executed ? 'Executed agreement' : 'Review & sign'}
            </p>
            <h3 className="text-base font-black tracking-tight text-ink">Micro-Bond Sponsorship Agreement</h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-ink-faint hover:text-ink">✕</button>
        </div>

        {/* Contract body */}
        <div className="overflow-y-auto px-6 py-6 sm:px-10" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
          <div className="text-center">
            <h1 className="text-lg font-black tracking-wide text-ink">MICRO-BOND SPONSORSHIP AGREEMENT</h1>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">{s.title}</p>
          </div>
          <div className="my-5 flex justify-between border-y border-line py-2.5 text-xs text-ink-soft">
            <span>Contract No: <b className="text-ink">{s.contractNo ?? '—'}</b></span>
            <span>Offered: {fmtDate(s.createdAt)}</span>
          </div>
          <p className="text-sm leading-relaxed text-ink">
            This Agreement is made between <b>{s.orgName}</b> ("the Sponsor") and <b>{studentName || 'the Candidate'}</b> ("the Candidate").
          </p>
          <ol className="mt-4 space-y-3">
            {rows.map(([h, b], i) => (
              <li key={h} className="text-sm leading-relaxed text-ink">
                <b>{i + 1}. {h}.</b> {b}
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-col gap-8 sm:flex-row sm:gap-12">
            <div className="flex-1">
              <div className="min-h-[34px] text-2xl text-[#0a2540]" style={{ fontFamily: '"Snell Roundhand","Segoe Script",cursive' }}>
                {executed ? s.signedName : ''}
              </div>
              <div className="border-t border-ink/60 pt-1.5 text-[11px] text-ink-soft">
                Candidate — {studentName || '—'}
                {executed && s.signedAt ? ` · Signed ${fmtDate(s.signedAt)}` : ''}
              </div>
            </div>
            <div className="flex-1">
              <div className="min-h-[34px] text-2xl text-[#0a2540]" style={{ fontFamily: '"Snell Roundhand","Segoe Script",cursive' }}>{s.orgName}</div>
              <div className="border-t border-ink/60 pt-1.5 text-[11px] text-ink-soft">For and on behalf of the Sponsor</div>
            </div>
          </div>
          {executed && (
            <div className="mt-6 inline-block rounded-[3px] border border-success/50 px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-success-ink">
              ✓ Executed · {s.contractNo}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-line px-6 py-4">
          {canSign ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Type your full legal name to sign"
                  className="w-full border border-line-strong bg-cream px-3.5 py-2.5 text-lg text-[#0a2540] rounded-[2px] focus:border-ink focus:bg-white focus:outline-none"
                  style={{ fontFamily: '"Snell Roundhand","Segoe Script",cursive' }}
                />
              </div>
              <label className="flex items-start gap-2 text-xs text-ink-soft">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-ink" />
                <span>I have read and agree to the terms of this Agreement, and I am signing it electronically.</span>
              </label>
              {error && <p className="text-xs font-medium text-danger">{error}</p>}
              <div className="flex items-center justify-between gap-3">
                <Button variant="ghost" onClick={onDecline}>Decline offer</Button>
                <Button
                  disabled={!agree || name.trim().length < 3 || signing}
                  onClick={() => onSign?.(name.trim())}
                >
                  {signing ? 'Signing…' : 'Sign & submit'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-ink-faint">This agreement has been executed by both parties.</span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={print}>Print / Save PDF</Button>
                <Button onClick={onClose}>Done</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
