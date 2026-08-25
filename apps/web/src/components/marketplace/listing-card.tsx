import Link from "next/link";
import Image from "next/image";
import type { ListingCard as ListingCardData } from "@homes/shared";
import { formatCurrency } from "@/lib/utils";
import { WishlistHeart } from "./wishlist-heart";

function isRemote(src: string | null): src is string {
  return !!src && /^https?:\/\//.test(src);
}

export function ListingCard({
  listing: l,
  saved = false,
}: {
  listing: ListingCardData;
  saved?: boolean;
}) {
  const location = [l.city, l.region].filter(Boolean).join(", ");
  const specs = [
    l.bedrooms != null ? `${l.bedrooms} bd` : null,
    l.bathrooms != null ? `${l.bathrooms} ba` : null,
    l.areaSqft != null ? `${l.areaSqft.toLocaleString()} sqft` : null,
  ].filter(Boolean);

  return (
    <Link href={`/listing/${l.slug}`} className="group block">
      {/* Image — full-bleed, 12px radius, no border/shadow */}
      <div className="rounded-card bg-deco relative aspect-[4/3] w-full overflow-hidden">
        {isRemote(l.primaryPhoto) ? (
          <Image
            src={l.primaryPhoto}
            alt={l.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="text-foggy/60 flex h-full items-center justify-center text-[13px]">
            No photo yet
          </div>
        )}

        {l.isFeatured && (
          <span className="bg-white text-hof shadow-subtle absolute left-3 top-3 rounded-full px-3 py-1 text-[12px] font-semibold">
            Featured
          </span>
        )}
        <WishlistHeart listingId={l.id} initialSaved={saved} className="absolute right-2 top-2" />
      </div>

      {/* Meta — 12px gutter, no card padding */}
      <div className="pt-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-hof text-[15px] tabular-nums">
            <span className="font-semibold">
              {formatCurrency(l.price, { currency: l.currency, noDecimals: true })}
            </span>
            {l.tenure === "rent" && l.rentPeriod ? (
              <span className="text-foggy font-normal">/{l.rentPeriod}</span>
            ) : null}
          </span>
          <span className="text-foggy text-[12px] capitalize">{l.tenure === "sale" ? "For sale" : "For rent"}</span>
        </div>
        <h3 className="text-hof mt-0.5 line-clamp-1 text-[14px] font-medium">{l.title}</h3>
        {location && <p className="text-foggy mt-0.5 line-clamp-1 text-[14px]">{location}</p>}
        {specs.length > 0 && (
          <p className="text-foggy mt-0.5 text-[13px]">{specs.join(" · ")}</p>
        )}
      </div>
    </Link>
  );
}
