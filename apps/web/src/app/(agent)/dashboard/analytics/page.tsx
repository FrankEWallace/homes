import { Eye, MessageSquare, Heart, Home } from "lucide-react";
import { getAgentAnalytics } from "@/server/agent-analytics";
import { AnalyticsChart } from "./analytics-chart";

export const dynamic = "force-dynamic";

function StatTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}

export default async function AnalyticsPage() {
  const analytics = await getAgentAnalytics();

  if (!analytics || analytics.listings.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1 text-sm">Views, enquiries, and saves per listing.</p>
        </div>
        <div className="rounded-lg border border-dashed p-8">
          <p className="text-muted-foreground text-sm">
            No data yet — analytics appear once you have published listings with activity.
          </p>
        </div>
      </div>
    );
  }

  const { totals, listings } = analytics;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1 text-sm">Views, enquiries, and saves per listing.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total views" value={totals.views} icon={<Eye className="size-4" />} />
        <StatTile label="Enquiries" value={totals.leads} icon={<MessageSquare className="size-4" />} />
        <StatTile label="Saved" value={totals.saved} icon={<Heart className="size-4" />} />
        <StatTile label="Published" value={totals.published} icon={<Home className="size-4" />} />
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="mb-4 text-sm font-medium">Per listing</h2>
        <AnalyticsChart data={listings} />
      </div>
    </div>
  );
}
