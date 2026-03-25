import { getMyAvailabilityDates } from '@/app/actions/availability'
import { AvailabilityCalendar } from '@/components/availability/AvailabilityCalendar'
import { format } from 'date-fns'

export default async function MyAvailabilityPage() {
  const initialMonth = format(new Date(), 'yyyy-MM')
  const availability = await getMyAvailabilityDates(initialMonth)

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Elérhetőségem</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Add meg mikor tudsz dolgozni – ez segít a vezérnek a beosztástervezésben
        </p>
      </div>
      <AvailabilityCalendar initialData={availability} initialMonth={initialMonth} />
    </div>
  )
}
