// A login oldal nem igényli a super admin auth ellenőrzést
export default function SuperAdminLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
