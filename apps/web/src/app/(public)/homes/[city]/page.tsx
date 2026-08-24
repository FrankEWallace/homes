import Link from "next/link";
import type { Metadata } from "next";
import { searchListings } from "@/server/listings";
import { ApiError } from "@/server/api-client";
import { ListingCard } from "@/components/marketplace/listing-card";
import { publicEnv } from "@/lib/env";

export const revalidate = 300;

function cityName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function generateMetadata({ params }: PageProps<"/homes/[city]">): Promise<Metadata> {
  const { city } = await params;
  const name = cityName(city);
  return {
    title: `Homes for sale & rent in ${name}`,
    description: `Browse houses, condos, and apartments for sale and rent in ${name}.`,
    alternates: { canonical: `${publicEnv.NEXT_PUBLIC_SITE_URL}/homes/${city}` },
  };
}

export default async function CityLandingPage({ params }: PageProps<"/homes/[city]">) {
  const { city } = await params;
  const name = cityName(city);

  let items: Awaited<ReturnType<typeof searchListings>>["items"] = [];
  let total = 0;
  let error: string | null = null;
  try {
    const result = await searchListings({ city: name, sort: "relevance", page: 1, limit: 12 });
    items = result.items;
    total = result.total;
  } catch (err) {
    error = err instanceof ApiError ? err.message : "Could not load listings.";
  }

  return (
    <div className="marketplace mx-auto w-full max-w-[1440px] px-6 py-10 md:px-10">
      <nav className="text-foggy mb-3 text-[13px]">
        <Link href="/" className="hover:text-hof">
          Home
        </Link>
        <span className="mx-1">/</span>
        <span className="text-hof">{name}</span>
      </nav>

      <h1 className="text-hof text-[28px] font-bold tracking-[-0.02em]">
        Homes in {name}
      </h1>
      <p className="text-foggy mt-2 max-w-2xl text-[16px]">
        {total > 0
          ? `${total} home${total === 1 ? "" : "s"} for sale and rent in ${name}. `
          : `Explore homes for sale and rent in ${name}. `}
        <Link href={`/search?q=${encodeURIComponent(name)}`} className="text-hof underline-offset-4 hover:underline">
          See all on the map →
        </Link>
      </p>

      {error && <p className="text-rausch mt-8 text-[14px]">{error}</p>}

      {!error && items.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {items.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}

      {!error && items.length === 0 && (
        <p className="text-foggy mt-16 text-[16px]">No published homes in {name} yet.</p>
      )}
    </div>
  );
}
