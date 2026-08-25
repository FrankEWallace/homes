import { RowsSkeleton } from "@/components/marketplace/skeletons";

export default function SavedSearchesLoading() {
  return (
    <div className="mx-auto w-full max-w-[720px] px-6 py-8">
      <div className="bg-deco mb-2 h-8 w-56 animate-pulse rounded" />
      <div className="bg-deco mb-8 h-4 w-72 animate-pulse rounded" />
      <RowsSkeleton />
    </div>
  );
}
