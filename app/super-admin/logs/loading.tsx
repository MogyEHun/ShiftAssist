import { Skeleton, SkeletonRow } from '@/components/ui/Skeleton'

export default function SuperAdminLogsLoading() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 divide-y divide-gray-100">
        {Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    </div>
  )
}
