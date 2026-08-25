import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getMyListings } from "@/server/agent-listings";
import { ListingActions } from "./listing-actions";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  published: "default",
  draft: "secondary",
  withdrawn: "outline",
  under_offer: "outline",
  sold: "outline",
  let: "outline",
};

function price(l: { priceAmount: number; priceCurrency: string; tenure: string; rentPeriod: string | null }) {
  const s = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: l.priceCurrency,
    maximumFractionDigits: 0,
  }).format(l.priceAmount);
  return l.tenure === "rent" && l.rentPeriod ? `${s}/${l.rentPeriod}` : s;
}

export default async function AgentListingsPage() {
  const listings = await getMyListings();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Listings</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your published and draft listings.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/listings/import">Import CSV</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/listings/new">
              <Plus className="size-4" /> New listing
            </Link>
          </Button>
        </div>
      </div>

      {listings.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-8">
          <p className="text-muted-foreground text-sm">
            You have no listings yet. Create your first one to start receiving enquiries.
          </p>
          <Button asChild>
            <Link href="/dashboard/listings/new">
              <Plus className="size-4" /> New listing
            </Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Listing</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {listings.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <div className="font-medium">{l.title}</div>
                    <div className="text-muted-foreground text-xs capitalize">
                      {l.type} · {l.city}
                      {l.region ? `, ${l.region}` : ""}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[l.status] ?? "secondary"} className="capitalize">
                      {l.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{price(l)}</TableCell>
                  <TableCell className="text-muted-foreground text-right tabular-nums">{l.viewCount}</TableCell>
                  <TableCell className="text-right">
                    <ListingActions listing={l} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
