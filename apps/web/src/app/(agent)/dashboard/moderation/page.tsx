import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/server/auth";
import { getModerationQueue, type ModerationFlag } from "@/server/admin";
import { ModerationActions } from "@/components/agent/moderation-actions";

// Admin-only, per-request.
export const dynamic = "force-dynamic";

const flagStyles: Record<ModerationFlag["type"], string> = {
  content: "bg-red-100 text-red-800",
  duplicate: "bg-amber-100 text-amber-800",
  suspended: "bg-zinc-200 text-zinc-800",
};

export default async function ModerationPage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/dashboard/moderation");
  if (user.role !== "admin") redirect("/dashboard");

  const items = await getModerationQueue();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Moderation</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Listings flagged for review — possible discriminatory content, likely duplicates, or
          already suspended. Suspending removes a listing from public search until reinstated.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="text-sm font-medium">Nothing to review</p>
          <p className="text-muted-foreground mt-1 text-sm">
            No listings are currently flagged. Good news.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const suspended = item.status === "suspended";
            const agent = item.host.businessName || `${item.host.firstName} ${item.host.lastName}`.trim();
            return (
              <li
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/listing/${item.slug}`}
                      className="font-medium hover:underline"
                      target="_blank"
                    >
                      {item.title}
                    </Link>
                    {item.flags.map((f, i) => (
                      <span
                        key={i}
                        className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${flagStyles[f.type]}`}
                        title={f.detail}
                      >
                        {f.type === "suspended" ? "suspended" : f.type}
                      </span>
                    ))}
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {item.city}
                    {item.address ? ` · ${item.address}` : ""} · {agent}
                  </p>
                  <ul className="text-muted-foreground mt-1 text-[13px]">
                    {item.flags.map((f, i) => (
                      <li key={i}>• {f.detail}</li>
                    ))}
                  </ul>
                </div>
                <div className="shrink-0">
                  <ModerationActions listingId={item.id} suspended={suspended} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
