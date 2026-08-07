'use client'

import type React from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase/client'
import { CindelBrand } from '@/components/cindel-brand'
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

const countryCodes = [
  { code: '+233', label: 'Ghana (+233)' },
  { code: '+1', label: 'United States (+1)' },
  { code: '+44', label: 'United Kingdom (+44)' },
  { code: '+234', label: 'Nigeria (+234)' },
  { code: '+27', label: 'South Africa (+27)' },
  { code: '+254', label: 'Kenya (+254)' },
  { code: '+91', label: 'India (+91)' },
  { code: '+49', label: 'Germany (+49)' },
  { code: '+33', label: 'France (+33)' },
  { code: '+971', label: 'UAE (+971)' },
]

function loginErrorMessage(error: unknown): string {
  const { code, status } = (error ?? {}) as { code?: string; status?: number }

  if (code === 'over_request_rate_limit' || status === 429) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (code === 'otp_expired') {
    return 'That code has expired. Please request a new one.'
  }
  if (code === 'invalid_token') {
    return 'That code is invalid. Please check it and try again.'
  }
  if (code === 'phone_not_found') {
    return 'No account found for that phone number. Please sign up first.'
  }
  if (code === 'validation_failed') {
    return 'Please enter a valid phone number.'
  }
  return 'Something went wrong. Please try again.'
}

const DEV_AUTH_COOKIE = 'cindel_dev_auth'

// Seeded demo accounts for real-data testing (see supabase/seed.sql).
// Password for both is the constant below. Signing in creates a real
// Supabase session so the chat reads/writes actual rows.
const DEMO_PASSWORD = 'CindelTest123!'
const DEMO_ACCOUNTS = [
  { label: 'Demo: Alice', phone: '233550000001' },
  { label: 'Demo: Bob', phone: '233550000002' },
]

export default function LoginPage() {
  const [countryCode, setCountryCode] = useState('+233')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [devCode, setDevCode] = useState('')
  const [isCodeSent, setIsCodeSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const isDev = process.env.NODE_ENV !== 'production'
  const fullPhone = `${countryCode}${phone.replace(/\D+/g, '')}`

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (fullPhone.length < 8) {
      setError('Please enter a valid phone number.')
      return
    }
    setIsLoading(true)
    setError(null)

    // Dev mode: generate a mock code shown on screen (no SMS needed).
    if (isDev) {
      const generated = Math.floor(100000 + Math.random() * 900000).toString()
      setDevCode(generated)
      setCode('')
      setIsCodeSent(true)
      setIsLoading(false)
      toast.success('Dev mode: code generated')
      return
    }

    try {
      const { error } = await createClient().auth.signInWithOtp({
        phone: fullPhone,
        options: { shouldCreateUser: true },
      })
      if (error) throw error
      setIsCodeSent(true)
      toast.success('Code sent. Check your phone.')
    } catch (err) {
      console.error('[cindel] Send OTP error:', err)
      setError(loginErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

// Real sign-in with a seeded demo account (password auth) so the chat has
  // a genuine Supabase session, not just a dev cookie.
  const handleDemoLogin = async (phone: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const { error } = await createClient().auth.signInWithPassword({
        phone,
        password: DEMO_PASSWORD,
      })
      if (error) throw error
      toast.success('Signed in as demo user')
      router.push('/chat')
      router.refresh()
    } catch (err) {
      console.error('[cindel] Demo login error:', err)
      setError('Demo login failed. Make sure supabase/seed.sql was run.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Dev mode: verify against the on-screen mock code, then set a dev cookie.
    if (isDev) {
      if (code === devCode) {
        document.cookie = `${DEV_AUTH_COOKIE}=1; path=/; max-age=86400`
        toast.success('Welcome back!')
        router.push('/chat')
        router.refresh()
      } else {
        setError('That code is invalid. Please check it and try again.')
      }
      setIsLoading(false)
      return
    }

    try {
      const { error } = await createClient().auth.verifyOtp({
        phone: fullPhone,
        token: code,
        type: 'sms',
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
              {isCodeSent ? 'Enter the 6-digit code sent to your phone.' : 'Enter your phone number to receive a sign-in code.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={isCodeSent ? handleVerifyCode : handleSendCode} className="flex flex-col gap-6">
              {!isCodeSent && (
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="flex gap-2">
                    <select
                      id="country-code"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      aria-label="Country code"
                    >
                      {countryCodes.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.label}
                        </option>
                      ))}
                    </select>
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="055 123 4567"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^\d\s-]/g, ''))}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">We&apos;ll send a 6-digit code to this number.</p>
                </div>
              )}
              {isCodeSent && (
                <div className="grid gap-2">
                  <Label htmlFor="code">6-digit code</Label>
                  {isDev && (
                    <div className="rounded-lg border border-dashed bg-muted/50 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Dev mode verification code</p>
                      <p className="mt-1 font-mono text-2xl font-bold tracking-widest">{devCode}</p>
                    </div>
                  )}
                  <Input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </div>
              )}
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full bg-[#581bf2] hover:bg-[#6b2ff7] disabled:bg-[#581bf2]/50" disabled={isLoading}>
                {isLoading ? (isCodeSent ? 'Verifying...' : 'Sending...') : (isCodeSent ? 'Verify' : 'Send Code')}
              </Button>
              {isCodeSent && (
                <button type="button" className="text-sm text-muted-foreground underline-offset-4 hover:underline" onClick={() => { setIsCodeSent(false); setCode(''); setError(null) }}>
                  Use a different phone number
                </button>
              )}
            </form>
{isDev && (
              <div className="mt-6 border-t border-border pt-4">
                <p className="text-center text-xs text-muted-foreground">Dev mode — quick login</p>
                <div className="mt-2 flex flex-col gap-2">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.phone}
                      type="button"
                      disabled={isLoading}
                      onClick={() => void handleDemoLogin(acc.phone)}
                      className="w-full rounded-lg border border-input px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
                    >
                      {acc.label}
                    </button>
                  ))}
                </div>
              </div>
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
      </div>
    </main>
  )
}
