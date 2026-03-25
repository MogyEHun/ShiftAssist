import { getAvailableSwaps } from '@/app/actions/schedule'
import { SwapRequestManager } from '@/components/schedule/SwapRequestManager'
import { getLocale, getT } from '@/lib/i18n'

export default async function MySwapPage() {
  const t = getT(getLocale())
  const availableSwaps = await getAvailableSwaps()

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">{t('mySwap.title')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('mySwap.subtitle')}</p>
      </div>
      <SwapRequestManager swapRequests={availableSwaps} />
    </div>
  )
}
