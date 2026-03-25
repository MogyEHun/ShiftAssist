import { redirect } from 'next/navigation'
import { verifySuperAdmin, getDeletionRequests } from '@/app/actions/super-admin'
import { Trash2 } from 'lucide-react'
import Link from 'next/link'

const roleLabel: Record<string, string> = {
  owner: 'Tulajdonos',
  admin: 'Admin',
  manager: 'Menedzser',
  employee: 'Dolgozó',
}

export default async function DeletionRequestsPage() {
  const superAdmin = await verifySuperAdmin()
  if (!superAdmin) redirect('/admin/login')

  const requests = await getDeletionRequests()

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Törlési kérelmek</h1>
        <p className="text-slate-500 mt-1">
          {requests.length > 0
            ? `${requests.length} aktív törlési kérelem`
            : 'Nincsenek aktív törlési kérelmek'}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
            <Trash2 className="h-8 w-8 opacity-40" />
            <p>Nincs aktív törlési kérelem.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100">
                  <th className="px-6 py-3">Felhasználó</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Cég</th>
                  <th className="px-4 py-3">Szerepkör</th>
                  <th className="px-4 py-3">Törlés dátuma</th>
                  <th className="px-4 py-3">Hátralévő</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req) => (
                  <tr key={req.userId} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-800">{req.fullName}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{req.email}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/companies/${req.companyId}`}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        {req.companyName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {roleLabel[req.role] ?? req.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(req.deletionDate).toLocaleDateString('hu-HU', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        req.daysLeft <= 7
                          ? 'bg-red-100 text-red-700'
                          : req.daysLeft <= 14
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {req.daysLeft > 0 ? `${req.daysLeft} nap` : 'Lejárt'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
