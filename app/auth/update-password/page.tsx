'use client'

import type React from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase/client'
import { CindelBrand } from '@/components/cindel-brand'
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

const PASSWORD_MIN = 8
const DEV_AUTH_COOKIE = 'cindel_dev_auth'

function passwordErrorMessage(error: unknown): string {
  const { code, message, status } = (error ?? {}) as {
    code?: string
    message?: string
    status?: number
  }
  if (code === 'over_request_rate_limit' || status === 429) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (code === 'weak_password') {
    return message || `Password must be at least ${PASSWORD_MIN} characters.`
  }
  if (code === 'validation_failed') {
    return `Password must be at least ${PASSWORD_MIN} characters.`
  }
  return 'Something went wrong. Please try again.'
}

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()

  const isDev = process.env.NODE_ENV !== 'production'

  // Production: only reachable via the reset-link exchange (which logs the
  // user in). If there's no session, send them back to log in. Dev mode skips
  // the check so the flow stays testable offline.
  useEffect(() => {
    if (isDev) {
      setChecking(false)
      return
    }
    let cancelled = false
    ;(async () => {
      const {
        data: { user },
      } = await createClient().auth.getUser()
      if (cancelled) return
      if (!user) {
        router.replace('/auth/login')
        return
      }
      setChecking(false)
    })()
    return () => {
      cancelled = true
    }
  }, [isDev, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordMeetsRules(password)) {
      setError('Password needs at least 8 characters, an uppercase and lowercase letter, a number, and a symbol.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match. Please try again.')
      return
    }
    setIsLoading(true)
    setError(null)

    // Dev mode: simulate the update and sign in with the dev cookie.
    if (isDev) {
      document.cookie = `${DEV_AUTH_COOKIE}=1; path=/; max-age=86400`
      toast.success('Password updated. Welcome back!')
      router.push('/chat')
      router.refresh()
      setIsLoading(false)
      return
    }

    try {
      const { error } = await createClient().auth.updateUser({ password })
      if (error) throw error
      toast.success('Password updated.')
      router.push('/chat')
      router.refresh()
    } catch (err) {
      console.error('[cindel] Update password error:', err)
      setError(passwordErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-svh w-full items-center justify-center bg-muted/30 p-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-muted/30 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <CindelBrand />
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-oswald text-center uppercase text-[#5130e0]">Set a new password</CardTitle>
            <CardDescription>
              Choose a strong password you haven&apos;t used here before.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="password">New password</Label>
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
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat your new password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
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
                {isLoading ? 'Updating...' : 'Update password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
