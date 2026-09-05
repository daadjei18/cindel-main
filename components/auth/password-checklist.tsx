'use client'

import { Check, X } from 'lucide-react'

/** Shared password policy: shown as a live checklist while the user types. */
export const PASSWORD_RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
  { label: 'One uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { label: 'One number (0-9)', test: (p) => /[0-9]/.test(p) },
  { label: 'One symbol (!@#$%^&*)', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

/** True only when every rule is met — mirror this in your submit validation. */
export function passwordMeetsRules(p: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(p))
}

/**
 * Live checklist shown under a password field. Each rule ticks green as the
 * user types, so nobody misses a requirement before submitting.
 */
export function PasswordChecklist({ password }: { password: string }) {
  return (
    <ul className="mt-1 grid gap-1 text-xs" aria-label="Password requirements">
      {PASSWORD_RULES.map((rule) => {
        const met = password.length > 0 && rule.test(password)
        return (
          <li
            key={rule.label}
            className={`flex items-center gap-1.5 ${met ? 'text-emerald-600' : 'text-muted-foreground'}`}
          >
            {met ? (
              <Check className="size-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <X className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
            )}
            {rule.label}
          </li>
        )
      })}
    </ul>
  )
}