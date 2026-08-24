import Link from "next/link";
import type { SearchParams } from "@homes/shared";
import { searchListings } from "@/server/listings";
import { ApiError } from "@/server/api-client";
import { ListingCard } from "@/components/marketplace/listing-card";
import { FilterBar } from "@/components/marketplace/filter-bar";
import { SearchMap } from "@/components/marketplace/search-map";

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
function num(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const tenureRaw = first(sp.tenure);
  const sortRaw = first(sp.sort);
  const params: SearchParams = {
    q: first(sp.q),
    tenure: tenureRaw === "sale" || tenureRaw === "rent" ? tenureRaw : undefined,
    city: first(sp.city),
    minBeds: num(first(sp.minBeds)),
    priceMax: num(first(sp.priceMax)),
    sort:
      sortRaw === "price_asc" || sortRaw === "price_desc" || sortRaw === "newest"
        ? sortRaw
        : "relevance",
    page: num(first(sp.page)) ?? 1,
    limit: 24,
  };

  let result: Awaited<ReturnType<typeof searchListings>> | null = null;
  let error: string | null = null;
  try {
    result = await searchListings(params);
  } catch (err) {
    error = err instanceof ApiError ? err.message : "Could not reach the listings service.";
  }

  const pageUrl = (p: number) => {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      const val = first(v as string | string[] | undefined);
      if (val) usp.set(k, val);
    }
    usp.set("page", String(p));
    return `/search?${usp.toString()}`;
  };

  return (
    <div className="marketplace mx-auto w-full max-w-[1440px] px-6 py-6 md:px-10">
      <div className="mb-5 flex flex-col gap-4">
        <FilterBar />
        <div className="flex items-baseline justify-between gap-2">
          <h1 className="text-hof text-[22px] font-semibold tracking-[-0.02em]">
            {params.q ? `Homes in “${params.q}”` : params.tenure === "rent" ? "Homes for rent" : "Homes for sale"}
          </h1>
          {result && (
            <p className="text-foggy text-[14px] tabular-nums">
              {result.total} home{result.total === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="border-rausch/30 text-rausch rounded-input border bg-white p-4 text-[14px]">
          {error} Is the backend running on <code>API_BASE_URL</code>?
        </div>
      )}

      {result && result.items.length === 0 && !error && (
        <p className="text-foggy py-24 text-center text-[16px]">No homes match your search.</p>
      )}

      {result && result.items.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(360px,38%)]">
          {/* Results */}
          <div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              {result.items.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>

            {result.totalPages > 1 && (
              <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Pagination">
                {params.page > 1 && (
                  <Link
                    href={pageUrl(params.page - 1)}
                    className="border-bebe text-hof hover:border-hof rounded-full border px-4 py-2 text-[14px] font-medium"
                  >
                    Previous
                  </Link>
                )}
                <span className="text-foggy px-2 text-[14px] tabular-nums">
                  Page {result.page} of {result.totalPages}
                </span>
                {params.page < result.totalPages && (
                  <Link
                    href={pageUrl(params.page + 1)}
                    className="border-bebe text-hof hover:border-hof rounded-full border px-4 py-2 text-[14px] font-medium"
                  >
                    Next
                  </Link>
                )}
              </nav>
            )}
          </div>

          {/* Map rail — sticky on desktop */}
          <div className="rounded-card border-bebe hidden overflow-hidden border lg:sticky lg:top-24 lg:block lg:h-[calc(100vh-8rem)]">
            <SearchMap items={result.items} />
          </div>
        </div>
      )}
    </div>
  );
}
