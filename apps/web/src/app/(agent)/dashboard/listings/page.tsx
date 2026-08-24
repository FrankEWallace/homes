import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const rows = [
  { title: "Sunny Victorian near Dolores Park", city: "San Francisco", status: "published", price: "$1,850,000", views: 842, leads: 5 },
  { title: "Modern SoMa Condo with skyline views", city: "San Francisco", status: "published", price: "$1,200,000", views: 519, leads: 2 },
  { title: "Nob Hill 1-bed with parking", city: "San Francisco", status: "published", price: "$3,400/mo", views: 301, leads: 3 },
  { title: "East Austin bungalow", city: "Austin", status: "published", price: "$720,000", views: 268, leads: 1 },
  { title: "Lakeview lot (draft)", city: "Austin", status: "draft", price: "$395,000", views: 0, leads: 0 },
];

export default function AgentListingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Listings</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your published and draft listings.</p>
        </div>
        <Button>
          <Plus className="size-4" /> New listing
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Listing</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="text-right">Leads</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.title}>
                <TableCell>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-muted-foreground text-xs">{r.city}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={r.status === "published" ? "default" : "secondary"} className="capitalize">
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.price}</TableCell>
                <TableCell className="text-right tabular-nums">{r.views.toLocaleString()}</TableCell>
                <TableCell className="text-right tabular-nums">{r.leads}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-muted-foreground text-xs">Sample data — CRUD + media upload land in Phase 4.</p>
    </div>
  );
}
