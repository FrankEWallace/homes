import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAgentLeads, getLeadStats } from "@/server/leads";
import { LeadStatusSelect } from "./lead-status-select";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  enquiry: "Enquiry",
  contact: "Contact",
  viewing_request: "Viewing",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default async function AgentLeadsPage() {
  const [{ leads, total, unauthorized }, stats] = await Promise.all([
    getAgentLeads(),
    getLeadStats(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Enquiries from seekers on your listings.
        </p>
      </div>

      {unauthorized ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-8">
          <p className="text-muted-foreground text-sm">
            Sign in as an agent to see leads delivered to your listings.
          </p>
          <Link
            href="/login?next=/dashboard/leads"
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
          >
            Sign in
          </Link>
        </div>
      ) : (
        <>
          {stats ? (
            <div className="flex flex-wrap gap-3 text-sm">
              {(["new", "contacted", "qualified", "closed"] as const).map((s) => (
                <span key={s} className="rounded-md border px-3 py-1.5 capitalize">
                  {s} <span className="tabular-nums font-semibold">{stats[s]}</span>
                </span>
              ))}
            </div>
          ) : null}

          {leads.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8">
              <p className="text-muted-foreground text-sm">
                No leads yet. When a seeker enquires on one of your listings, it lands here.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seeker</TableHead>
                    <TableHead>Listing</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <div className="font-medium">{l.name}</div>
                        <div className="text-muted-foreground text-xs">{l.email}</div>
                        {l.phone ? <div className="text-muted-foreground text-xs">{l.phone}</div> : null}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[240px]">
                        <Link href={`/listing/${l.listing.slug}`} className="hover:underline">
                          {l.listing.title}
                        </Link>
                        <p className="mt-1 line-clamp-2 text-xs">{l.message}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {KIND_LABEL[l.kind] ?? l.kind}
                      </TableCell>
                      <TableCell>
                        <LeadStatusSelect id={l.id} status={l.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right text-sm tabular-nums">
                        {timeAgo(l.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="text-muted-foreground text-xs">{total} total lead{total === 1 ? "" : "s"}.</p>
        </>
      )}
    </div>
  );
}
