import { Home, Inbox, Eye, Heart, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const stats = [
  { label: "Active listings", value: "6", delta: "+1 this week", icon: Home },
  { label: "New leads", value: "12", delta: "+4 today", icon: Inbox },
  { label: "Views (30d)", value: "3,481", delta: "+18%", icon: Eye },
  { label: "Saved by seekers", value: "218", delta: "+22", icon: Heart },
];

const recentLeads = [
  { name: "Alex Morgan", listing: "Sunny Victorian near Dolores Park", when: "2h ago", status: "new" },
  { name: "Priya Shah", listing: "Downtown Austin 2-bed", when: "5h ago", status: "new" },
  { name: "Chris Lee", listing: "Modern SoMa Condo", when: "1d ago", status: "contacted" },
];

export default function AgentDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">Your listings and leads at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardDescription>{s.label}</CardDescription>
                <s.icon className="text-muted-foreground size-4" />
              </div>
              <CardTitle className="text-3xl tabular-nums">{s.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground flex items-center gap-1 text-xs">
              <TrendingUp className="size-3.5" /> {s.delta}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent leads</CardTitle>
          <CardDescription>Enquiries from the last 24 hours (sample data).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y">
          {recentLeads.map((l) => (
            <div key={l.name} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{l.name}</p>
                <p className="text-muted-foreground truncate text-xs">{l.listing}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Badge variant={l.status === "new" ? "default" : "secondary"} className="capitalize">
                  {l.status}
                </Badge>
                <span className="text-muted-foreground text-xs tabular-nums">{l.when}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">Live data + agent auth are wired in Phase 4.</p>
    </div>
  );
}
