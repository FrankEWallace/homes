export default function LeadsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="bg-muted h-7 w-24 animate-pulse rounded" />
        <div className="bg-muted mt-2 h-4 w-64 animate-pulse rounded" />
      </div>
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-muted h-8 w-24 animate-pulse rounded-md" />
        ))}
      </div>
      <div className="bg-muted h-64 w-full animate-pulse rounded-lg" />
    </div>
  );
}
