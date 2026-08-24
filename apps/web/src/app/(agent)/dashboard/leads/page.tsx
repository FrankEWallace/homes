import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const leads = [
  { name: "Alex Morgan", email: "alex@example.com", listing: "Sunny Victorian near Dolores Park", when: "2h ago", status: "new" },
  { name: "Priya Shah", email: "priya@example.com", listing: "Downtown Austin 2-bed", when: "5h ago", status: "new" },
  { name: "Chris Lee", email: "chris@example.com", listing: "Modern SoMa Condo", when: "1d ago", status: "contacted" },
  { name: "Dana White", email: "dana@example.com", listing: "East Austin bungalow", when: "2d ago", status: "qualified" },
  { name: "Sam Okoro", email: "sam@example.com", listing: "Nob Hill 1-bed with parking", when: "3d ago", status: "closed" },
];

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  new: "default",
  contacted: "secondary",
  qualified: "outline",
  closed: "outline",
};

export default function AgentLeadsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <p className="text-muted-foreground mt-1 text-sm">Enquiries from seekers on your listings.</p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Seeker</TableHead>
              <TableHead>Listing</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Received</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((l) => (
              <TableRow key={l.email}>
                <TableCell>
                  <div className="font-medium">{l.name}</div>
                  <div className="text-muted-foreground text-xs">{l.email}</div>
                </TableCell>
                <TableCell className="text-muted-foreground">{l.listing}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[l.status] ?? "secondary"} className="capitalize">
                    {l.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-right text-sm tabular-nums">{l.when}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-muted-foreground text-xs">Sample data — lead delivery + inbox actions land in Phase 3–4.</p>
    </div>
  );
}
