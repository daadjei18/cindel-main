'use client'

import { useEffect, useState } from 'react'
import { MailCheck, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export type CodeStepProps = {
  /** Email the code was sent to (shown under the input). */
  email: string
  /** Dev mode: show the generated code on screen. */
  isDev: boolean
  /** The on-screen code shown in dev mode. */
  devCode: string | null
  /** Inline error to display (e.g. wrong code). */
  error: string | null
  /** True while a verify/resend request is in flight. */
  busy: boolean
  /** How long a code stays usable on screen before it "expires". */
  expirySeconds?: number
  /** Seconds to wait before the resend button unlocks. */
  resendCooldownSeconds?: number
  /** Label for the verify button. */
  verifyLabel?: string
  /** Label for the "go back" action (method-specific). */
  backLabel: string
  /** Called with the typed code when the user clicks verify. */
  onVerify: (code: string) => void
  /** Called to email/regenerate a new code. Timers reset when it resolves. */
  onResend: () => Promise<void> | void
  /** Called when the user backs out of the code stage. */
  onBack: () => void
}

/**
 * Second stage of the password/code sign-in flows. Owns the 6-digit input and
 * two timers: how long the code stays valid, and how long before a resend is
 * allowed. Production shows a "check your email" hint; dev shows the code.
 */
export function CodeStep({
  email,
  isDev,
  devCode,
  error,
  busy,
  expirySeconds = 300,
  resendCooldownSeconds = 30,
  verifyLabel = 'Verify',
  backLabel,
  onVerify,
  onResend,
  onBack,
}: CodeStepProps) {
  const [code, setCode] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(expirySeconds)
  const [cooldown, setCooldown] = useState(resendCooldownSeconds)

  // Count both timers down once per second.
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0))
      setCooldown((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const expired = secondsLeft === 0
  const resendLocked = cooldown > 0

  const handleResend = async () => {
    if (resendLocked || busy) return
    try {
      await onResend()
      // A fresh code was issued — restart both timers.
      setSecondsLeft(expirySeconds)
      setCooldown(resendCooldownSeconds)
      setCode('')
    } catch {
      // Error is surfaced by the parent (inline error/toast).
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-5">
      <div className="grid gap-2">
        <Label htmlFor="code">6-digit code</Label>
        {isDev && devCode ? (
          <div className="rounded-lg border border-dashed bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Dev mode verification code</p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-widest">{devCode}</p>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <MailCheck className="size-4 shrink-0" aria-hidden="true" />
            <span>
              We emailed a 6-digit code to <span className="font-medium text-foreground">{email}</span>.
              Check your inbox (and spam folder).
            </span>
          </div>
        )}

        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          maxLength={6}
          pattern="[0-9]{6}"
          autoFocus
          disabled={busy || expired}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && code.length === 6 && !busy && !expired) {
              onVerify(code)
            }
          }}
        />

        {expired ? (
          <p className="text-xs font-medium text-destructive" role="alert">
            That code has expired. Request a new one below.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Code expires in {fmt(secondsLeft)}
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button
        type="button"
        onClick={() => !busy && !expired && code.length === 6 && onVerify(code)}
        className="w-full bg-[#581bf2] hover:bg-[#6b2ff7] disabled:bg-[#581bf2]/50"
        disabled={busy || expired || code.length !== 6}
      >
        {busy ? 'Verifying...' : verifyLabel}
      </Button>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={resendLocked || busy}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
        >
          <RefreshCw className={`size-3.5 ${busy ? 'animate-spin' : ''}`} aria-hidden="true" />
          {resendLocked ? `Resend code in ${fmt(cooldown)}` : 'Resend code'}
        </button>
        <button
          type="button"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={onBack}
        >
          {backLabel}
        </button>
      </div>
    </div>
  )
}
