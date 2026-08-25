import Link from "next/link";
import { getListingTypes } from "@/server/agent-listings";
import { ListingForm } from "../listing-form";

export const dynamic = "force-dynamic";

export default async function NewListingPage() {
  const types = await getListingTypes();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard/listings" className="text-muted-foreground text-sm hover:underline">
          ← Listings
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">New listing</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Fill in the details. It’s saved as a draft you can publish when ready.
        </p>
      </div>
      <ListingForm types={types} />
    </div>
  );
}
