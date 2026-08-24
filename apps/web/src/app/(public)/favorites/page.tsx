import Link from "next/link";
import { getFavorites } from "@/server/wishlist";
import { ListingCard } from "@/components/marketplace/listing-card";

export const metadata = { title: "Saved homes · homes" };
export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const favorites = await getFavorites();

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-8 md:px-10">
      <h1 className="text-hof mb-1 text-[26px] font-bold tracking-[-0.02em]">Saved homes</h1>
      <p className="text-foggy mb-8 text-[15px]">
        {favorites.length > 0
          ? `${favorites.length} home${favorites.length === 1 ? "" : "s"} saved.`
          : "Homes you save appear here."}
      </p>

      {favorites.length === 0 ? (
        <div className="border-bebe rounded-card flex flex-col items-center gap-3 border border-dashed py-24 text-center">
          <p className="text-foggy text-[16px]">You haven’t saved any homes yet.</p>
          <Link
            href="/search"
            className="bg-rausch rounded-full px-5 py-2.5 text-[14px] font-semibold text-white hover:opacity-90"
          >
            Browse homes
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {favorites.map((l) => (
            <ListingCard key={l.id} listing={l} saved />
          ))}
        </div>
      )}
    </div>
  );
}
