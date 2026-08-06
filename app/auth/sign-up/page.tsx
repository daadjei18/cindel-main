'use client'

import type React from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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

// Supabase does not reveal whether an email is already registered, so the
// fallback stays generic. Validation failures describe the user's own input.
function signUpErrorMessage(error: unknown): string {
  const { code, status } = (error ?? {}) as { code?: string; status?: number }

  if (code === 'weak_password') {
    return 'Please choose a stronger password (at least 6 characters).'
  }
  if (code === 'email_address_invalid') {
    return 'Please use a real email address — example and test domains are not supported.'
  }
  if (code === 'email_address_not_authorized') {
    return 'We cannot send a confirmation email to that address. Please use a different one.'
  }
  if (code === 'validation_failed') {
    return 'Please check the details you entered.'
  }
  if (code === 'over_email_send_rate_limit' || status === 429) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  return 'Unable to complete sign-up. Please try again.'
}

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords don't match.")
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
            `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
      router.push('/auth/sign-up-success')
    } catch (err) {
      console.error('[v0] Sign-up error:', err)
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
              Join Cindel to connect and start chatting.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp} className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
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
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating account...' : 'Sign up'}
              </Button>
            </form>
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
      </div>
    </main>
  )
}
