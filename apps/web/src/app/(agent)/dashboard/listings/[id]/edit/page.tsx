import Link from "next/link";
import { notFound } from "next/navigation";
import { getListingTypes, getMyListing } from "@/server/agent-listings";
import { ListingForm } from "../../listing-form";

export const dynamic = "force-dynamic";

export default async function EditListingPage({ params }: PageProps<"/dashboard/listings/[id]/edit">) {
  const { id } = await params;
  const [listing, types] = await Promise.all([getMyListing(id), getListingTypes()]);
  if (!listing) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard/listings" className="text-muted-foreground text-sm hover:underline">
          ← Listings
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Edit listing</h1>
        <p className="text-muted-foreground mt-1 text-sm">{listing.title}</p>
      </div>
      <ListingForm types={types} listing={listing} />
    </div>
  );
}
