import { getOpenShifts } from '@/app/actions/open-shifts'
import { OpenShiftsPage } from '@/components/schedule/OpenShiftsPage'

export default async function MyOpenShiftsPage() {
  const shifts = await getOpenShifts()

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Szabad műszakok</h1>
        <p className="text-sm text-gray-500 mt-0.5">Vállalj fel elérhető műszakokat</p>
      </div>
      <OpenShiftsPage shifts={shifts} userRole="employee" />
    </div>
  )
}
