import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'

export default function SuperAdminStatsLoading() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-3">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-[280px] w-full rounded-lg" />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-3">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-[280px] w-full rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  )
}
