/** Shared loading skeletons for the marketplace surface. Pure presentational. */

export function CardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="rounded-card bg-deco aspect-[4/3] w-full" />
      <div className="pt-3">
        <div className="bg-deco h-4 w-1/3 rounded" />
        <div className="bg-deco mt-2 h-3 w-2/3 rounded" />
        <div className="bg-deco mt-2 h-3 w-1/2 rounded" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function RowsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border-bebe h-20 animate-pulse rounded-2xl border bg-white" />
      ))}
    </div>
  );
}
