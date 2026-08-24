import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getListing } from "@/server/listings";
import { formatCurrency, getInitials } from "@/lib/utils";
import { WishlistHeart } from "@/components/marketplace/wishlist-heart";
import { SearchMap } from "@/components/marketplace/search-map";

function isRemote(src: string | undefined): src is string {
  return !!src && /^https?:\/\//.test(src);
}

export async function generateMetadata({ params }: PageProps<"/listing/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListing(slug);
  if (!listing) return { title: "Listing not found" };
  const where = [listing.city, listing.region].filter(Boolean).join(", ");
  return {
    title: `${listing.title} — ${where}`,
    description: listing.description.slice(0, 155),
    alternates: { canonical: `/listing/${listing.slug}` },
    openGraph: { title: listing.title, description: listing.description.slice(0, 155) },
  };
}

export default async function ListingPage({ params }: PageProps<"/listing/[slug]">) {
  const { slug } = await params;
  const listing = await getListing(slug);
  if (!listing) notFound();

  const where = [listing.address, listing.city, listing.region, listing.postalCode]
    .filter(Boolean)
    .join(", ");
  const price = formatCurrency(listing.priceAmount, { currency: listing.priceCurrency, noDecimals: true });
  const specs: { label: string; value: string | number }[] = [];
  if (listing.bedrooms != null) specs.push({ label: "Bedrooms", value: listing.bedrooms });
  if (listing.bathrooms != null) specs.push({ label: "Bathrooms", value: listing.bathrooms });
  if (listing.areaSqft != null) specs.push({ label: "Area", value: `${listing.areaSqft.toLocaleString()} sqft` });
  if (listing.yearBuilt != null) specs.push({ label: "Year built", value: listing.yearBuilt });

  const agentName = listing.host
    ? listing.host.businessName || `${listing.host.firstName} ${listing.host.lastName}`
    : "the agent";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: listing.title,
    description: listing.description,
    url: `/listing/${listing.slug}`,
    ...(isRemote(listing.images[0]) ? { image: listing.images[0] } : {}),
    offers: {
      "@type": "Offer",
      price: listing.priceAmount,
      priceCurrency: listing.priceCurrency,
    },
  };

  return (
    <div className="marketplace mx-auto w-full max-w-[1120px] px-6 py-6 md:px-10">
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Title row */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-hof text-[22px] font-semibold tracking-[-0.02em] md:text-[28px]">
            {listing.title}
          </h1>
          <p className="text-foggy mt-1 text-[14px]">{where}</p>
        </div>
        <WishlistHeart className="mt-1 shrink-0" />
      </div>

      {/* Gallery */}
      <div className="rounded-card grid gap-2 overflow-hidden md:grid-cols-4 md:grid-rows-2">
        <div className="bg-deco relative aspect-[16/10] md:col-span-2 md:row-span-2 md:aspect-auto">
          {isRemote(listing.images[0]) ? (
            <Image src={listing.images[0]} alt={listing.title} fill sizes="50vw" className="object-cover" priority />
          ) : (
            <div className="text-foggy/60 flex h-full items-center justify-center text-[13px]">No photos yet</div>
          )}
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-deco relative hidden aspect-[4/3] md:block">
            {isRemote(listing.images[i]) ? (
              <Image src={listing.images[i] as string} alt="" fill sizes="25vw" className="object-cover" />
            ) : null}
          </div>
        ))}
      </div>

      {/* Body: details + sticky contact */}
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="border-bebe flex items-baseline gap-2 border-b pb-6">
            <span className="text-hof text-[28px] font-bold tabular-nums">{price}</span>
            {listing.tenure === "rent" && listing.rentPeriod ? (
              <span className="text-foggy text-[16px]">/{listing.rentPeriod}</span>
            ) : (
              <span className="text-foggy text-[16px]">· For sale</span>
            )}
          </div>

          {specs.length > 0 && (
            <dl className="border-bebe grid grid-cols-2 gap-4 border-b py-6 sm:grid-cols-4">
              {specs.map((s) => (
                <div key={s.label}>
                  <dt className="text-foggy text-[13px]">{s.label}</dt>
                  <dd className="text-hof mt-0.5 text-[16px] font-semibold tabular-nums">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="py-6">
            <h2 className="text-hof text-[20px] font-semibold tracking-[-0.01em]">About this home</h2>
            <p className="text-hof mt-3 text-[14px] leading-[1.6] whitespace-pre-line">
              {listing.description}
            </p>
          </div>

          <div className="border-bebe border-t py-6">
            <h2 className="text-hof text-[20px] font-semibold tracking-[-0.01em]">Location</h2>
            <p className="text-foggy mt-2 text-[14px]">{where}</p>
            <div className="rounded-card border-bebe mt-4 aspect-[16/7] overflow-hidden border">
              {listing.latitude != null && listing.longitude != null ? (
                <SearchMap
                  items={[
                    {
                      id: listing.id,
                      slug: listing.slug,
                      title: listing.title,
                      tenure: listing.tenure,
                      price: listing.priceAmount,
                      currency: listing.priceCurrency,
                      rentPeriod: listing.rentPeriod,
                      bedrooms: listing.bedrooms,
                      bathrooms: listing.bathrooms,
                      areaSqft: listing.areaSqft,
                      city: listing.city,
                      region: listing.region,
                      propertyType: listing.type,
                      isFeatured: listing.isFeatured,
                      lng: listing.longitude,
                      lat: listing.latitude,
                      primaryPhoto: listing.images[0] ?? null,
                    },
                  ]}
                />
              ) : (
                <div className="bg-deco text-foggy/60 flex h-full items-center justify-center text-[13px]">
                  Location unavailable
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contact card */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="border-bebe rounded-card bg-white p-5 shadow-subtle">
            <div className="flex items-center gap-3">
              <div className="bg-hof grid size-11 place-items-center rounded-full text-[14px] font-semibold text-white">
                {getInitials(agentName)}
              </div>
              <div className="min-w-0">
                <p className="text-hof truncate text-[15px] font-semibold">{agentName}</p>
                <p className="text-foggy text-[13px]">Listing agent</p>
              </div>
            </div>
            <button
              type="button"
              className="bg-hof mt-4 h-11 w-full rounded-full text-[14px] font-medium text-white transition-opacity hover:opacity-90"
            >
              Contact agent
            </button>
            <button
              type="button"
              className="border-hof text-hof hover:bg-faint mt-2 h-11 w-full rounded-full border text-[14px] font-medium transition-colors"
            >
              Request a viewing
            </button>
            <p className="text-foggy mt-3 text-center text-[12px]">
              Enquiry delivery is wired in Phase 3.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
