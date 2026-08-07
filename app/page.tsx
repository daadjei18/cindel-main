import { redirect } from 'next/navigation'

/** Home page simply points to the chat app. */
export default function HomePage() {
  redirect('/chat')
}
