import { redirect } from 'next/navigation'

// Főoldal → átirányítás a login oldalra
export default function HomePage() {
  redirect('/login')
}
