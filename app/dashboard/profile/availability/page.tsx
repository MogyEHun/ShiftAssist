import { getMyAvailabilityDates } from '@/app/actions/availability'
import { AvailabilityCalendar } from '@/components/availability/AvailabilityCalendar'
import { Clock } from 'lucide-react'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function AvailabilityPage() {
  const initialMonth = format(new Date(), 'yyyy-MM')
  const availabilities = await getMyAvailabilityDates(initialMonth)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#1a5c3a]/10 flex items-center justify-center">
            <Clock className="h-5 w-5 text-[#1a5c3a]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Elérhetőségem</h1>
            <p className="text-sm text-gray-500">Add meg mikor tudsz dolgozni – a vezető ezt figyelembe veszi a beosztásnál</p>
          </div>
        </div>
      </div>

      <AvailabilityCalendar initialData={availabilities} initialMonth={initialMonth} />
    </div>
  )
}
