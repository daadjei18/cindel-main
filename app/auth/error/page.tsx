import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

import { CindelBrand } from '@/components/cindel-brand'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-muted/30 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <CindelBrand />
        <Card>
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-6" aria-hidden="true" />
            </div>
            <CardTitle className="text-xl">Authentication error</CardTitle>
            <CardDescription>
              Something went wrong while confirming your account. The link may
              have expired or already been used.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/auth/login">Back to log in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
