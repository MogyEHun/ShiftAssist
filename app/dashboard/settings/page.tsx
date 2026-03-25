import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { User, Shield, Clock, CreditCard, Trash2, ChevronRight } from 'lucide-react'
import { getLocale, getT } from '@/lib/i18n'

export default async function SettingsPage() {
  const t = getT(getLocale())
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'employee'
  const isOwnerOrAdmin = ['owner', 'admin'].includes(role)

  const groups = [
    {
      label: t('settings.accountSection'),
      items: [
        {
          href: '/dashboard/settings/profile',
          icon: User,
          title: t('settings.editProfile'),
          description: t('settings.editProfileDesc'),
          show: true,
          color: 'bg-blue-50 text-blue-600',
        },
        {
          href: '/dashboard/settings/2fa',
          icon: Shield,
          title: t('settings.twoFactor'),
          description: t('settings.twoFactorDesc'),
          show: true,
          color: 'bg-violet-50 text-violet-600',
        },
      ],
    },
    {
      label: t('settings.companySection'),
      items: [
        {
          href: '/dashboard/settings/overtime',
          icon: Clock,
          title: t('settings.overtime'),
          description: t('settings.overtimeDesc'),
          show: isOwnerOrAdmin,
          color: 'bg-amber-50 text-amber-600',
        },
        {
          href: '/dashboard/billing',
          icon: CreditCard,
          title: t('settings.billingTitle'),
          description: t('settings.billingDesc'),
          show: isOwnerOrAdmin,
          color: 'bg-sky-50 text-sky-600',
        },
      ],
    },
    {
      label: t('settings.dangerSection'),
      items: [
        {
          href: '/dashboard/settings/delete-account',
          icon: Trash2,
          title: t('settings.deleteAccount'),
          description: t('settings.deleteAccountDesc'),
          show: true,
          color: 'bg-red-50 text-red-500',
          danger: true as const,
        },
      ],
    },
  ]

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('settings.description')}</p>
      </div>

      {groups.map((group) => {
        const visible = group.items.filter(s => s.show)
        if (!visible.length) return null
        return (
          <div key={group.label}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">{group.label}</p>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
              {visible.map((s) => {
                const Icon = s.icon
                return (
                  <Link
                    key={s.href}
                    href={s.href}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
                  >
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${'danger' in s && s.danger ? 'text-red-600' : 'text-gray-900'}`}>{s.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{s.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
