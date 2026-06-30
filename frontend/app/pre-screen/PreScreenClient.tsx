"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EligibilityResultCard } from "@/components/prescreener/EligibilityResultCard"
import { calculateAffordability, type EmploymentStatus, type EligibilityBand } from "@/lib/affordabilityCalc"
import { useDraftPersist } from "@/hooks/useDraftPersist"

const EMPLOYMENT_OPTIONS: { value: EmploymentStatus; label: string }[] = [
  { value: "employed", label: "Employed (Full-time)" },
  { value: "self-employed", label: "Self-Employed" },
  { value: "contract", label: "Contract / Freelance" },
  { value: "student", label: "Student" },
]

const EMPLOYMENT_LABELS: Record<EmploymentStatus, string> = {
  employed: "High",
  "self-employed": "Medium",
  contract: "Medium",
  student: "Low",
}

interface PreScreenDraft {
  step: number
  monthlyNetIncome: string
  monthlyRent: string
  employmentStatus: EmploymentStatus | null
  depositPercentage: number
}

const DRAFT_KEY = "prescreen_draft"

export function PreScreenClient() {
  const searchParams = useSearchParams()
  const listingPrice = searchParams.get("listingPrice")

  const [step, setStep] = useState(1)
  const [monthlyNetIncome, setMonthlyNetIncome] = useState("")
  const [monthlyRent, setMonthlyRent] = useState("")
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus | null>(null)
  const [depositPercentage, setDepositPercentage] = useState(10)
  const [result, setResult] = useState<{
    band: EligibilityBand
    incomePass: boolean
    depositPass: boolean
  } | null>(null)
  const [showResumePrompt, setShowResumePrompt] = useState(false)

  const { save, load, clear } = useDraftPersist<PreScreenDraft>(DRAFT_KEY)

  // Load draft on mount and offer resume
  useEffect(() => {
    const draft = load()
    if (draft && draft.step > 1) {
      setShowResumePrompt(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyDraft = (draft: PreScreenDraft) => {
    setStep(draft.step)
    setMonthlyNetIncome(draft.monthlyNetIncome)
    setMonthlyRent(draft.monthlyRent || (listingPrice ? String(parseFloat(listingPrice) / 12) : ""))
    setEmploymentStatus(draft.employmentStatus)
    setDepositPercentage(draft.depositPercentage)
  }

  const handleResume = () => {
    const draft = load()
    if (draft) applyDraft(draft)
    setShowResumePrompt(false)
  }

  const handleStartOver = () => {
    clear()
    setShowResumePrompt(false)
  }

  const saveDraft = (patch: Partial<PreScreenDraft>) => {
    const current: PreScreenDraft = {
      step,
      monthlyNetIncome,
      monthlyRent,
      employmentStatus,
      depositPercentage,
      ...patch,
    }
    save(current)
  }

  const parsedRent = useMemo(
    () => parseFloat(monthlyRent) || (listingPrice ? parseFloat(listingPrice) / 12 : 0),
    [monthlyRent, listingPrice],
  )
  const parsedIncome = useMemo(() => parseFloat(monthlyNetIncome) || 0, [monthlyNetIncome])

  const incomePass =
    parsedIncome > 0 && parsedRent > 0 ? parsedRent / parsedIncome <= 0.4 : null

  const handleSubmit = () => {
    if (!employmentStatus) return
    const calc = calculateAffordability({
      monthlyNetIncome: parsedIncome,
      monthlyRent: parsedRent,
      employmentStatus,
      depositPercentage,
      minDepositRequired: 20,
    })
    setResult({ band: calc.overallBand, incomePass: calc.incomePass, depositPass: calc.depositPass })
    clear()
    setStep(4)
  }

  if (showResumePrompt) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto max-w-lg px-4 py-12">
          <Card className="border-3 border-foreground p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
            <h2 className="text-lg font-black mb-2">Resume your pre-screen?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              You have a saved pre-screen in progress. Would you like to continue where you left off,
              or start fresh?
            </p>
            <div className="flex gap-3">
              <Button
                onClick={handleResume}
                className="border-3 border-foreground bg-primary font-bold shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] transition-all"
              >
                Resume
              </Button>
              <Button
                variant="outline"
                onClick={handleStartOver}
                className="border-3 border-foreground font-bold shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] transition-all"
              >
                Start over
              </Button>
            </div>
          </Card>
        </div>
      </main>
    )
  }

  if (result) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto max-w-lg px-4 py-12">
          <EligibilityResultCard
            band={result.band}
            incomePass={result.incomePass}
            employmentLabel={employmentStatus ? EMPLOYMENT_LABELS[employmentStatus] : ""}
            depositPass={result.depositPass}
            onReset={() => {
              setStep(1)
              setResult(null)
              setMonthlyNetIncome("")
              setMonthlyRent("")
              setEmploymentStatus(null)
              setDepositPercentage(10)
            }}
          />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-lg px-4 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-black">Rent Affordability Pre-Screener</h1>
          <p className="text-sm text-muted-foreground mt-2">
            See if you qualify before you apply. This takes about 30 seconds.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8" aria-label="Progress" role="group">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`h-8 w-8 border-2 border-foreground flex items-center justify-center text-sm font-bold ${
                  step > s ? "bg-primary" : step === s ? "bg-card" : "bg-muted"
                }`}
                aria-current={step === s ? "step" : undefined}
                aria-label={`Step ${s}${step > s ? " (completed)" : step === s ? " (current)" : ""}`}
              >
                {step > s ? <Check className="h-4 w-4" aria-hidden="true" /> : s}
              </div>
              {s < 3 && <div className={`h-0.5 w-8 ${step > s ? "bg-primary" : "bg-muted"}`} aria-hidden="true" />}
            </div>
          ))}
        </div>

        <Card className="border-3 border-foreground p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-black">Income Check</h2>
                <p className="text-sm text-muted-foreground mt-1">Enter your monthly income to check affordability.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold block mb-1" htmlFor="income">
                    Monthly Net Income (NGN)
                  </label>
                  <input
                    id="income"
                    type="number"
                    min="0"
                    placeholder="e.g. 500000"
                    value={monthlyNetIncome}
                    onChange={(e) => {
                      setMonthlyNetIncome(e.target.value)
                      saveDraft({ monthlyNetIncome: e.target.value })
                    }}
                    className="w-full border-2 border-foreground bg-background px-3 py-2 text-sm"
                    aria-describedby={incomePass !== null ? "income-feedback" : undefined}
                  />
                </div>
                <div>
                  <label className="text-sm font-bold block mb-1" htmlFor="rent">
                    Expected Monthly Rent (NGN)
                    {listingPrice && (
                      <span className="font-normal text-muted-foreground"> (pre-filled from listing)</span>
                    )}
                  </label>
                  <input
                    id="rent"
                    type="number"
                    min="0"
                    placeholder="e.g. 150000"
                    value={monthlyRent}
                    onChange={(e) => {
                      setMonthlyRent(e.target.value)
                      saveDraft({ monthlyRent: e.target.value })
                    }}
                    className="w-full border-2 border-foreground bg-background px-3 py-2 text-sm"
                  />
                </div>

                {incomePass !== null && (
                  <div
                    id="income-feedback"
                    role="status"
                    className={`border-2 border-foreground p-3 ${incomePass ? "bg-green-50" : "bg-destructive/10"}`}
                  >
                    <p className={`text-sm font-bold ${incomePass ? "text-green-700" : "text-destructive"}`}>
                      {incomePass
                        ? "Pass — Your rent is within the recommended threshold."
                        : "Fail — Your rent exceeds 40% of your net income."}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Recommended: Rent should not exceed 40% of your monthly net income.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    setStep(2)
                    saveDraft({ step: 2 })
                  }}
                  disabled={!monthlyNetIncome || !monthlyRent}
                  className="border-3 border-foreground bg-primary font-bold shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] transition-all disabled:opacity-50"
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-black">Employment Status</h2>
                <p className="text-sm text-muted-foreground mt-1">Select your current employment situation.</p>
              </div>

              <div className="space-y-2" role="radiogroup" aria-label="Employment status">
                {EMPLOYMENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    role="radio"
                    aria-checked={employmentStatus === opt.value}
                    onClick={() => {
                      setEmploymentStatus(opt.value)
                      saveDraft({ employmentStatus: opt.value })
                    }}
                    className={`w-full text-left border-2 border-foreground p-3 text-sm font-medium transition-all ${
                      employmentStatus === opt.value
                        ? "bg-primary shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
                        : "bg-card hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {employmentStatus && (
                <div className="border-2 border-foreground p-3 bg-muted" aria-live="polite">
                  <p className="text-sm">
                    Likelihood band: <span className="font-bold">{EMPLOYMENT_LABELS[employmentStatus]}</span>
                  </p>
                </div>
              )}

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(1)
                    saveDraft({ step: 1 })
                  }}
                  className="border-3 border-foreground font-bold shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] transition-all"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                  Back
                </Button>
                <Button
                  onClick={() => {
                    setStep(3)
                    saveDraft({ step: 3 })
                  }}
                  disabled={!employmentStatus}
                  className="border-3 border-foreground bg-primary font-bold shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] transition-all disabled:opacity-50"
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-black">Deposit Readiness</h2>
                <p className="text-sm text-muted-foreground mt-1">How much upfront deposit can you put down?</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold block mb-1" htmlFor="deposit-range">
                    Available Deposit: <span className="text-primary">{depositPercentage}%</span>
                  </label>
                  <input
                    id="deposit-range"
                    type="range"
                    min="0"
                    max="100"
                    value={depositPercentage}
                    onChange={(e) => {
                      const val = parseInt(e.target.value)
                      setDepositPercentage(val)
                      saveDraft({ depositPercentage: val })
                    }}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={depositPercentage}
                    aria-valuetext={`${depositPercentage}%`}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1" aria-hidden="true">
                    <span>0%</span>
                    <span>Minimum: 20%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div
                  role="status"
                  aria-live="polite"
                  className={`border-2 border-foreground p-3 ${depositPercentage >= 20 ? "bg-green-50" : "bg-destructive/10"}`}
                >
                  <p className={`text-sm font-bold ${depositPercentage >= 20 ? "text-green-700" : "text-destructive"}`}>
                    {depositPercentage >= 20
                      ? "Pass — Your deposit meets the minimum requirement."
                      : "Fail — Most listings require at least 20% deposit."}
                  </p>
                </div>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(2)
                    saveDraft({ step: 2 })
                  }}
                  className="border-3 border-foreground font-bold shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] transition-all"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="border-3 border-foreground bg-primary font-bold shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] transition-all"
                >
                  See Results
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  )
}
