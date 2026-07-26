/* Loading placeholders — a subtle pulse instead of bare "Loading…" text. */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-[2px] bg-line/70 ${className}`} aria-hidden="true" />
}

export function SkeletonCard() {
  return (
    <div className="flex flex-col gap-4 border border-line bg-white p-6 rounded-[2px]">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </div>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="mt-1 space-y-2">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-1 w-full" />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-16" />
      </div>
    </div>
  )
}

export function SkeletonGrid({ count = 6, className = 'sm:grid-cols-2 xl:grid-cols-3' }: { count?: number; className?: string }) {
  return (
    <div className={`grid grid-cols-1 gap-x-6 gap-y-8 ${className}`} aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
