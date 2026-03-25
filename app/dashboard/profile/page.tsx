import Link from 'next/link'
import { UserCircle, ChevronRight, Settings } from 'lucide-react'

export default function ProfilePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#1a5c3a]/10 flex items-center justify-center">
            <UserCircle className="h-5 w-5 text-[#1a5c3a]" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Profil</h1>
        </div>
      </div>

      <div className="space-y-3">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
        >
          <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Settings className="h-5 w-5 text-gray-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Beállítások</p>
            <p className="text-xs text-gray-500 mt-0.5">Cég és fiók beállítások</p>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </Link>
      </div>
    </div>
  )
}
