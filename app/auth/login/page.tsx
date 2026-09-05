'use client'

import type React from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase/client'
import { CindelBrand } from '@/components/cindel-brand'
import { CodeStep } from '@/components/auth/code-step'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_MIN = 8
const DEV_AUTH_COOKIE = 'cindel_dev_auth'

function loginErrorMessage(error: unknown): string {
  const { code, status } = (error ?? {}) as { code?: string; status?: number }

  if (code === 'over_request_rate_limit' || status === 429) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (code === 'otp_expired') {
    return 'That code has expired. Request a new one below.'
  }
  if (code === 'invalid_token') {
    return 'That code is invalid. Please check it and try again.'
  }
  if (code === 'invalid_credentials') {
    return 'Incorrect email or password. Please try again.'
  }
  if (code === 'email_not_confirmed') {
    return 'Please confirm your email address first — check your inbox for the confirmation link.'
  }
  if (code === 'validation_failed') {
    return 'Please enter a valid email address.'
  }
  if (code === 'email_provider_disabled' || code === 'provider_disabled') {
    return 'Email sign-in is currently disabled. Please try again later.'
  }
  return 'Something went wrong. Please try again.'
}

function setDevAuthCookie() {
  document.cookie = `${DEV_AUTH_COOKIE}=1; path=/; max-age=86400`
}

/** Dev mode: generate the mock code shown on screen. */
function generateDevCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)
  // True once we're on the "enter the emailed code" stage.
  const [isCodeSent, setIsCodeSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const isDev = process.env.NODE_ENV !== 'production'
  const normalizedEmail = email.trim().toLowerCase()

  /** Back out of the code stage to re-enter credentials. */
  const resetToCredentials = () => {
    setIsCodeSent(false)
    setDevCode(null)
    setError(null)
  }

  // ---------- Stage 1: password login (check password) ----------

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!EMAIL_RE.test(normalizedEmail)) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < PASSWORD_MIN) {
      setError(`Password must be at least ${PASSWORD_MIN} characters.`)
      return
    }
    setIsLoading(true)
    setError(null)

    // Dev mode: accept any credentials, then still require the on-screen code
    // so the two-stage flow can be tested without real email.
    if (isDev) {
      setDevCode(generateDevCode())
      setIsCodeSent(true)
      setIsLoading(false)
      toast.success('Dev mode: password accepted — code generated')
      return
    }

    try {
      const supabase = createClient()
      // 1. Validate the password. Success here only proves the credentials —
      //    it must not be the final login, so drop the session right away.
      const { error: pwError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })
      if (pwError) throw pwError
      await supabase.auth.signOut()

      // 2. Email a fresh 6-digit sign-in code to the same address.
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: false },
      })
      if (otpError) throw otpError

      setIsCodeSent(true)
      toast.success('Code sent. Check your email.')
    } catch (err) {
      console.error('[cindel] Password login error:', err)
      setError(loginErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  // ---------- Resend (stage 2) ----------

  const resendCode = async () => {
    // Dev: regenerate the mock code shown on screen.
    if (isDev) {
      setDevCode(generateDevCode())
      toast.success('Dev mode: new code generated')
      return
    }
    try {
      const { error } = await createClient().auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: false },
      })
      if (error) throw error
      toast.success('New code sent. Check your email.')
    } catch (err) {
      console.error('[cindel] Resend OTP error:', err)
      setError(loginErrorMessage(err))
      throw err
    }
  }

  // ---------- Stage 2: verify the code ----------

  const handleVerifyCode = async (code: string) => {
    setIsLoading(true)
    setError(null)

    // Dev mode: verify against the on-screen mock code, then set a dev cookie.
    if (isDev) {
      if (code === devCode) {
        setDevAuthCookie()
        toast.success('Welcome back!')
        router.push('/chat')
        router.refresh()
      } else {
        setError('That code is invalid. Please check it and try again.')
        setIsLoading(false)
      }
      return
    }

    try {
      const { error } = await createClient().auth.verifyOtp({
        email: normalizedEmail,
        token: code,
        type: 'email',
      })
      if (error) throw error
      toast.success('Welcome back!')
      router.push('/chat')
      router.refresh()
    } catch (err) {
      console.error('[cindel] Verify OTP error:', err)
      setError(loginErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-muted/30 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col items-center gap-2">
          <CindelBrand />
          <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-rubik)', color: '#0c0c0c' }}>Welcome back</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-oswald text-center uppercase text-[#5130e0]">Log in</CardTitle>
            <CardDescription>
              {isCodeSent
                ? 'Your password is correct — now confirm it&apos;s you.'
                : 'Enter your email and password — we&apos;ll email you a code to verify it&apos;s you.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isCodeSent ? (
              <CodeStep
                email={normalizedEmail}
                isDev={isDev}
                devCode={devCode}
                error={error}
                busy={isLoading}
                onVerify={(code) => void handleVerifyCode(code)}
                onResend={() => resendCode()}
                onBack={resetToCredentials}
                backLabel="Use a different email or password"
              />
            ) : (
              <form onSubmit={handlePasswordLogin} className="mt-6 flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder={`At least ${PASSWORD_MIN} characters`}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <div className="flex items-center justify-end">
                    <Link
                      href="/auth/forgot-password"
                      className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  {isDev && (
                    <p className="text-xs text-muted-foreground">
                      Dev mode: any email and password work.
                    </p>
                  )}
                </div>
                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  className="w-full bg-[#581bf2] hover:bg-[#6b2ff7] disabled:bg-[#581bf2]/50"
                  disabled={isLoading}
                >
                  {isLoading ? 'Checking...' : 'Log in'}
                </Button>
              </form>
            )}

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {"Don't have an account? "}
              <Link
                href="/auth/sign-up"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to Cindel&apos;s{' '}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </main>
  )
}