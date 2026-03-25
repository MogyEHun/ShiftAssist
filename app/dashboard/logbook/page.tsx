import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { BookOpen } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { hu } from 'date-fns/locale'
import { LOGBOOK_CATEGORY_LABELS, LOGBOOK_CATEGORY_COLORS, LogbookCategory } from '@/types'

export const dynamic = 'force-dynamic'

export default async function LogbookPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin', 'manager'].includes(profile.role)) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p>Nincs jogosultságod a logbook megtekintéséhez.</p>
      </div>
    )
  }

  const admin = createAdminClient()
  const { data: shifts } = await admin
    .from('shifts')
    .select(`
      id, title, start_time, logbook_entry, logbook_category,
      user:users!shifts_user_id_fkey(full_name)
    `)
    .eq('company_id', profile.company_id)
    .not('logbook_entry', 'is', null)
    .order('start_time', { ascending: false })
    .limit(100)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[#1a5c3a]/10 flex items-center justify-center">
          <BookOpen className="h-5 w-5 text-[#1a5c3a]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Műszak napló</h1>
          <p className="text-sm text-gray-500">Korábbi műszakok bejegyzései</p>
        </div>
      </div>

      {(!shifts || shifts.length === 0) ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Még nincsenek logbook bejegyzések</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shifts.map((shift: any) => {
            const cat = shift.logbook_category as LogbookCategory ?? 'normal'
            return (
              <div key={shift.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{shift.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {format(parseISO(shift.start_time), 'yyyy. MMM d. HH:mm', { locale: hu })}
                      {shift.user && ` · ${shift.user.full_name}`}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${LOGBOOK_CATEGORY_COLORS[cat]}`}>
                    {LOGBOOK_CATEGORY_LABELS[cat]}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{shift.logbook_entry}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
