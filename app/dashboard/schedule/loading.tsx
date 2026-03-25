// Betöltési skeleton – heti beosztás nézet
export default function ScheduleLoading() {
  return (
    <div className="flex-1 p-6">
      {/* Fejléc skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-9 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-9 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Fejléc sor */}
        <div className="grid gap-px bg-gray-200" style={{ gridTemplateColumns: '200px repeat(7, 1fr)' }}>
          <div className="bg-gray-50 p-3 h-12" />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="bg-gray-50 p-3 flex flex-col gap-1">
              <div className="h-3 w-8 bg-gray-200 rounded animate-pulse" />
              <div className="h-5 w-6 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Dolgozó sorok */}
        {Array.from({ length: 5 }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="grid gap-px bg-gray-200"
            style={{ gridTemplateColumns: '200px repeat(7, 1fr)' }}
          >
            {/* Névoszlop */}
            <div className="bg-white p-3 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
            {/* Napcellek */}
            {Array.from({ length: 7 }).map((_, colIdx) => (
              <div key={colIdx} className="bg-white p-2 min-h-[80px]">
                {/* Véletlenszerűen néhány cellában műszak skeleton */}
                {(rowIdx + colIdx) % 3 === 0 && (
                  <div className="h-14 bg-gray-100 rounded-lg animate-pulse" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
