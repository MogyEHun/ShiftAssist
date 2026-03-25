import { Skeleton, SkeletonRow } from '@/components/ui/Skeleton'

export default function StaffLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 divide-y divide-gray-100">
        {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    </div>
  )
}
