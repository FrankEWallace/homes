import { CardGridSkeleton } from "@/components/marketplace/skeletons";

export default function FavoritesLoading() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-8 md:px-10">
      <div className="bg-deco mb-2 h-8 w-48 animate-pulse rounded" />
      <div className="bg-deco mb-8 h-4 w-32 animate-pulse rounded" />
      <CardGridSkeleton />
    </div>
  );
}
