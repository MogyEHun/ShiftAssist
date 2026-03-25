import { Skeleton, SkeletonRow } from '@/components/ui/Skeleton'

export default function SuperAdminCompaniesLoading() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <Skeleton className="h-9 w-72 rounded-lg" />
        </div>
        <div className="p-4 divide-y divide-gray-100">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </div>
    </div>
  )
}
