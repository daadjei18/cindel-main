'use client'

import type React from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase/client'
import { CindelBrand } from '@/components/cindel-brand'
import { CodeStep } from '@/components/auth/code-step'
import { PasswordChecklist, passwordMeetsRules } from '@/components/auth/password-checklist'
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
const USERNAME_RE = /^[a-zA-Z0-9_-]{3,20}$/
const PASSWORD_MIN = 8
const DEV_AUTH_COOKIE = 'cindel_dev_auth'

function signUpErrorMessage(error: unknown): string {
  const { code, message, status } = (error ?? {}) as {
    code?: string
    message?: string
    status?: number
  }

  if (code === 'over_request_rate_limit' || status === 429) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (code === 'otp_expired') {
    return 'That code has expired. Request a new one below.'
  }
  if (code === 'invalid_token') {
    return 'That code is invalid. Please check it and try again.'
  }
  if (code === 'validation_failed') {
    return 'Please enter a valid email address.'
  }
  if (code === 'provider_disabled' || code === 'email_provider_disabled') {
    return 'Email sign-up is currently disabled. Please try again later.'
  }
  if (code === 'user_already_exists' || code === 'email_exists') {
    return 'An account with this email already exists. Try logging in instead.'
  }
  if (code === 'weak_password') {
    return message || `Password must be at least ${PASSWORD_MIN} characters.`
  }
  if (message && /duplicate key/i.test(message)) {
    return 'That username is already taken. Please choose another.'
  }
  return 'Unable to complete sign-up. Please try again.'
}

function setDevAuthCookie() {
  document.cookie = `${DEV_AUTH_COOKIE}=1; path=/; max-age=86400`
}

/** Unique fallback so every user is findable by username. */
function defaultUsername(): string {
  return `user-${Math.random().toString(36).slice(2, 8)}`
}

/** Dev mode: generate the mock code shown on screen. */
function generateDevCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)
  const [isCodeSent, setIsCodeSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const isDev = process.env.NODE_ENV !== 'production'
  const normalizedEmail = email.trim().toLowerCase()

  const resetToDetails = () => {
    setIsCodeSent(false)
    setDevCode(null)
    setError(null)
  }

  const validate = (): string | null => {
    if (!EMAIL_RE.test(normalizedEmail)) {
      return 'Please enter a valid email address.'
    }
    const trimmedUsername = username.trim()
    if (trimmedUsername && !USERNAME_RE.test(trimmedUsername)) {
      return 'Username must be 3-20 characters: letters, numbers, underscores, or dashes.'
    }
    if (!passwordMeetsRules(password)) {
      return 'Password needs at least 8 characters, an uppercase and lowercase letter, a number, and a symbol.'
    }
    return null
  }

  // ---------- Stage 1: password sign-up ----------

  const handlePasswordSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setIsLoading(true)
    setError(null)

    // Dev mode: no real backend, so just simulate account creation and move to
    // the code stage (code is shown on screen).
    if (isDev) {
      setDevCode(generateDevCode())
      setIsCodeSent(true)
      setIsLoading(false)
      toast.success('Dev mode: account will be created — code generated')
      return
    }

    try {
      const supabase = createClient()
      // 1. Create the account (email + password + username).
      const { error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { username: username.trim() || defaultUsername() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/chat`,
        },
      })
      if (signUpError) throw signUpError

      // 2. Drop any session Supabase just issued, so the emailed code is the
      //    final gate before the account can be used.
      await supabase.auth.signOut()

      // 3. Email a fresh 6-digit code to confirm + sign in.
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: false },
      })
      if (otpError) throw otpError

      setIsCodeSent(true)
      toast.success('Account created. Code sent — check your email.')
    } catch (err) {
      console.error('[cindel] Password sign-up error:', err)
      setError(signUpErrorMessage(err))
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
        // The account was already created in stage 1 — never auto-create here.
        options: { shouldCreateUser: false },
      })
      if (error) throw error
      toast.success('New code sent. Check your email.')
    } catch (err) {
      console.error('[cindel] Resend OTP error:', err)
      setError(signUpErrorMessage(err))
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
        toast.success('Account created. Welcome to Cindel!')
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
      toast.success('Account created. Welcome to Cindel!')
      router.push('/chat')
      router.refresh()
    } catch (err) {
      console.error('[cindel] Verify OTP error:', err)
      setError(signUpErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-muted/30 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col items-center gap-2">
          <CindelBrand />
          <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-rubik)', color: '#0c0c0c' }}>Chat. date. learn</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-oswald text-center uppercase text-[#5130e0]">Create your account</CardTitle>
            <CardDescription>
              {isCodeSent
                ? 'Account created — now confirm it&apos;s you.'
                : 'Pick a password — we&apos;ll email you a code to verify your account.'}
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
                onBack={resetToDetails}
                backLabel="Use a different email or password"
              />
            ) : (
              <form onSubmit={handlePasswordSignUp} className="mt-6 flex flex-col gap-6">
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
                  <Label htmlFor="username">Username <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Input
                    id="username"
                    type="text"
                    autoComplete="nickname"
                    placeholder="e.g. nana"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">How friends find you to start a chat. A random one is picked if you leave it blank.</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder={`At least ${PASSWORD_MIN} characters`}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <PasswordChecklist password={password} />
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
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            )}

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {'Already have an account? '}
              <Link
                href="/auth/login"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">
          By creating an account, you agree to Cindel&apos;s{' '}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </main>
  )
}