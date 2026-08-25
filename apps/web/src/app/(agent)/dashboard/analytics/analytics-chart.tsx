"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Row {
  title: string;
  views: number;
  leads: number;
  saved: number;
}

function short(title: string) {
  return title.length > 18 ? `${title.slice(0, 17)}…` : title;
}

/** Views / enquiries / saves per listing. */
export function AnalyticsChart({ data }: { data: Row[] }) {
  const chartData = data.map((d) => ({ ...d, name: short(d.title) }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          />
          <Bar dataKey="views" name="Views" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
          <Bar dataKey="leads" name="Enquiries" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
          <Bar dataKey="saved" name="Saved" fill="var(--chart-3)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
