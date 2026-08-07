import Link from 'next/link'
import { MailCheck } from 'lucide-react'

import { CindelBrand } from '@/components/cindel-brand'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function SignUpSuccessPage() {
  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-muted/30 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <CindelBrand />
        <Card>
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MailCheck className="size-6" aria-hidden="true" />
            </div>
            <CardTitle className="text-xl">Check your inbox</CardTitle>
            <CardDescription>
              We&apos;ve sent you a confirmation link. Please verify your email
              address to activate your account.
            </CardDescription>
          </CardHeader>
<CardContent>
            <Link
              href="/auth/login"
              className="inline-flex w-full items-center justify-center rounded-lg border border-transparent bg-primary px-2.5 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
            >
              Back to log in
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
