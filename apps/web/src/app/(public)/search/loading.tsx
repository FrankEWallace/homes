import { CardGridSkeleton } from "@/components/marketplace/skeletons";

export default function SearchLoading() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-6 md:px-10">
      <div className="bg-deco mb-6 h-10 w-64 animate-pulse rounded-full" />
      <CardGridSkeleton count={9} />
    </div>
  );
}
