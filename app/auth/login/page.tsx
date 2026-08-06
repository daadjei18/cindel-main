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

// Only the credential/existence signal is genericized to avoid account
// enumeration. Actionable errors are surfaced so users know what to fix.
function loginErrorMessage(error: unknown): string {
  const { code, status } = (error ?? {}) as { code?: string; status?: number }

  if (code === 'email_not_confirmed') {
    return 'Please confirm your email address — check your inbox for the link.'
  }
  if (code === 'over_request_rate_limit' || status === 429) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (code === 'otp_expired') {
    return 'That code has expired. Please request a new one.'
  }
  if (code === 'invalid_token') {
    return 'That code is invalid. Please check it and try again.'
  }
  return 'Something went wrong. Please try again.'
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [isCodeSent, setIsCodeSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await createClient().auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      })
      if (error) throw error
      setIsCodeSent(true)
      toast.success('Code sent. Check your email.')
    } catch (err) {
      console.error('[v0] Send OTP error:', err)
      setError(loginErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await createClient().auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      })
      if (error) throw error
      toast.success('Welcome back!')
      router.push('/')
      router.refresh()
    } catch (err) {
      console.error('[v0] Verify OTP error:', err)
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
              {isCodeSent ? 'Enter the 6-digit code sent to your email.' : 'Enter your email to receive a sign-in code.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={isCodeSent ? handleVerifyCode : handleSendCode} className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  disabled={isCodeSent}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {isCodeSent && (
                <div className="grid gap-2">
                  <Label htmlFor="code">6-digit code</Label>
                  <Input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\\D/g, '').slice(0, 6))}
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
                  Use a different email
                </button>
              )}
            </form>
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
