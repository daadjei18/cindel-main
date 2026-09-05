'use client'

import type React from 'react'
import { useState } from 'react'
import Link from 'next/link'
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function forgotErrorMessage(error: unknown): string {
  const { code, status } = (error ?? {}) as { code?: string; status?: number }
  if (code === 'over_request_rate_limit' || status === 429) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  return 'Something went wrong. Please try again.'
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const isDev = process.env.NODE_ENV !== 'production'
  const normalizedEmail = email.trim().toLowerCase()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!EMAIL_RE.test(normalizedEmail)) {
      setError('Please enter a valid email address.')
      return
    }
    setIsLoading(true)
    setError(null)

    // Dev mode has no real accounts/email, so just show the success state.
    if (isDev) {
      setSent(true)
      setIsLoading(false)
      return
    }

    try {
      const { error } = await createClient().auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
        },
      )
      if (error) throw error
      setSent(true)
    } catch (err) {
      console.error('[cindel] Forgot password error:', err)
      setError(forgotErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-muted/30 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <CindelBrand />
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-oswald text-center uppercase text-[#5130e0]">Reset your password</CardTitle>
            <CardDescription>
              {sent
                ? 'If an account exists for that email, we sent you a link to set a new password.'
                : 'Enter your email and we&apos;ll send you a password reset link.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="flex flex-col gap-6">
                {isDev && (
                  <>
                    <p className="rounded-lg border border-dashed bg-muted/50 p-3 text-center text-xs text-muted-foreground">
                      Dev mode: no email is actually sent.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        toast.info('Dev mode: skipping straight to the reset page')
                        window.location.href = '/auth/update-password'
                      }}
                    >
                      Open reset page
                    </Button>
                  </>
                )}
                <Link
                  href="/auth/login"
                  className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  Back to log in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
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
                  {isLoading ? 'Sending...' : 'Email reset link'}
                </Button>
                <Link
                  href="/auth/login"
                  className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  Back to log in
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">
          <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
            Privacy Policy
          </Link>
        </p>
      </div>
    </main>
  )
}
