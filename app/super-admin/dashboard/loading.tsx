import { Skeleton, SkeletonCard, SkeletonRow } from '@/components/ui/Skeleton'

export default function SuperAdminDashboardLoading() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 divide-y divide-gray-100">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    </div>
  )
}
