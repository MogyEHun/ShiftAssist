import { redirect } from 'next/navigation'
import { verifySuperAdmin, getAllCompanies } from '@/app/actions/super-admin'
import { CompaniesTable } from '@/components/super-admin/CompaniesTable'

export default async function SuperAdminCompaniesPage() {
  const superAdmin = await verifySuperAdmin()
  if (!superAdmin) redirect('/super-admin/login')

  const companies = await getAllCompanies()

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cégek</h1>
        <p className="text-slate-500 mt-1">{companies.length} regisztrált cég a platformon</p>
      </div>

      <CompaniesTable companies={companies} actorEmail={superAdmin.email} />
    </div>
  )
}
