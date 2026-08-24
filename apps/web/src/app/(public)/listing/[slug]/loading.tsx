export default function ListingLoading() {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-6 py-6 md:px-8">
      <div className="bg-deco mb-4 h-8 w-2/3 animate-pulse rounded" />
      <div className="grid grid-cols-4 grid-rows-2 gap-2">
        <div className="bg-deco rounded-card col-span-2 row-span-2 aspect-[4/3] animate-pulse" />
        <div className="bg-deco rounded-card aspect-square animate-pulse" />
        <div className="bg-deco rounded-card aspect-square animate-pulse" />
        <div className="bg-deco rounded-card aspect-square animate-pulse" />
        <div className="bg-deco rounded-card aspect-square animate-pulse" />
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-3">
          <div className="bg-deco h-6 w-40 animate-pulse rounded" />
          <div className="bg-deco h-4 w-full animate-pulse rounded" />
          <div className="bg-deco h-4 w-5/6 animate-pulse rounded" />
          <div className="bg-deco h-4 w-2/3 animate-pulse rounded" />
        </div>
        <div className="border-bebe rounded-card h-72 animate-pulse border bg-white" />
      </div>
    </div>
  );
}
