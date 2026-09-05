import type { Metadata } from 'next'
import Link from 'next/link'

import { CindelBrand } from '@/components/cindel-brand'

export const metadata: Metadata = {
  title: 'Privacy Policy — Cindel',
  description:
    'How Cindel collects, uses, and protects your information.',
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-svh bg-muted/30 py-10 md:py-16">
      <div className="mx-auto w-full max-w-2xl px-6">
        <CindelBrand />
        <article className="mt-10 rounded-2xl border bg-card p-6 text-card-foreground shadow-sm md:p-10">
          <h1 className="text-2xl font-bold tracking-tight">
            Cindel Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: September 4, 2026
          </p>

          <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground">
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">
                1. Who we are
              </h2>
              <p>
                Cindel (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) operates the
                Cindel chat application. This policy explains what we collect,
                why we collect it, and the choices you have.
              </p>
              <p>
                Questions about this policy can be sent to{' '}
                <a
                  href="mailto:support@cindel.app"
                  className="underline underline-offset-4"
                >
                  support@cindel.app
                </a>
                .
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">
                2. Information we collect
              </h2>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>Account information.</strong> Your email address and a
                  username so others can find and message you. Your display name,
                  avatar, and status line if you add them.
                </li>
                <li>
                  <strong>Messages.</strong> The content of chats you send and
                  receive, plus timestamps, so conversations appear correctly for
                  everyone involved.
                </li>
                <li>
                  <strong>Usage data.</strong> Basic analytics (such as page
                  views) used to understand how the app is used.
                </li>
              </ul>
              <p>
                We do not require a phone number, and we never sell your
                personal information.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">
                3. How we use your information
              </h2>
              <ul className="list-disc space-y-2 pl-5">
                <li>To create and secure your account and let you sign in.</li>
                <li>
                  To let other users find you by username and send you messages.
                </li>
                <li>To store and deliver your conversations.</li>
                <li>
                  To send you important service emails, such as sign-in codes or
                  password reset links.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">
                4. Sharing and service providers
              </h2>
              <p>
                We rely on trusted service providers to run Cindel. They may
                process your data only to provide those services:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>Supabase</strong> — hosts our database and handles
                  authentication and sign-in.
                </li>
                <li>
                  <strong>Resend</strong> — sends account emails such as codes
                  and reset links.
                </li>
                <li>
                  <strong>Vercel</strong> — hosts the application and provides
                  basic analytics.
                </li>
              </ul>
              <p>
                We may also disclose information where required by law, to
                protect the safety or rights of users, or to enforce our terms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">
                5. How long we keep data
              </h2>
              <p>
                We keep your account and messages for as long as your account is
                active. If you delete your account, we remove your profile and
                your messages. Copies may remain briefly in backups before being
                purged.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">
                6. Your choices and rights
              </h2>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>Edit your profile.</strong> Change your display name,
                  username, avatar, or status from inside the app.
                </li>
                <li>
                  <strong>Delete your account.</strong> Contact us at{' '}
                  <a
                    href="mailto:support@cindel.app"
                    className="underline underline-offset-4"
                  >
                    support@cindel.app
                  </a>{' '}
                  and we&apos;ll help you remove your data.
                </li>
                <li>
                  <strong>Access or export.</strong> Ask us for a copy of the
                  data we hold about you.
                </li>
              </ul>
              <p>
                Depending on where you live you may also have rights to
                correction, restriction, or objection under local law. To
                exercise any of these, contact us using the email above.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">
                7. Children
              </h2>
              <p>
                Cindel is not intended for children under 13, and we do not
                knowingly collect their information. If you believe a child has
                given us personal data, contact us and we will delete it.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">
                8. Security
              </h2>
              <p>
                We use encryption in transit, secure sign-in flows, and
                access-controlled hosting to protect your data. No method of
                transmission is 100% secure, so we cannot guarantee absolute
                security.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">
                9. Changes to this policy
              </h2>
              <p>
                We may update this policy from time to time. Material changes
                will be reflected here with a new &quot;Last updated&quot; date,
                and we&apos;ll notify you in the app where practical.
              </p>
            </section>
          </div>

          <p className="mt-10 border-t pt-6 text-sm text-muted-foreground">
            <Link href="/auth/login" className="underline underline-offset-4 hover:text-foreground">
              Back to log in
            </Link>
          </p>
        </article>
      </div>
    </main>
  )
}
