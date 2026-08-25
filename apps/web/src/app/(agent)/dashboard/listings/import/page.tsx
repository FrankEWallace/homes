import Link from "next/link";
import { ImportForm } from "./import-form";

export const metadata = { title: "Import listings" };

export default function ImportListingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard/listings" className="text-muted-foreground text-sm hover:underline">
          ← Listings
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Import listings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Upload a CSV to create multiple draft listings at once.
        </p>
      </div>
      <ImportForm />
    </div>
  );
}
