import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { getAdminUsers } from "@/server/admin";
import { UserActions } from "@/components/agent/user-actions";

export const dynamic = "force-dynamic";

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const me = await getSession();
  if (!me) redirect("/login?next=/dashboard/users");
  if (me.role !== "admin") redirect("/dashboard");

  const sp = await searchParams;
  const role = first(sp.role);
  const status = first(sp.status);
  const search = first(sp.search);
  const page = Number(first(sp.page)) || 1;

  const { users, total, totalPages } = await getAdminUsers({ role, status, search, page });

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Users &amp; agencies</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {total} account{total === 1 ? "" : "s"}. Change a role or suspend an account — suspended
          and banned users can&apos;t sign in.
        </p>
      </div>

      {/* Filters (GET form → URL params) */}
      <form className="mb-4 flex flex-wrap items-center gap-2" action="/dashboard/users">
        <input
          name="search"
          defaultValue={search}
          placeholder="Search name, email, agency"
          aria-label="Search users"
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-ring"
        />
        <select name="role" defaultValue={role ?? ""} aria-label="Filter by role" className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm">
          <option value="">All roles</option>
          <option value="seeker">Seekers</option>
          <option value="agent">Agents</option>
          <option value="admin">Admins</option>
        </select>
        <select name="status" defaultValue={status ?? ""} aria-label="Filter by status" className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>
        <button type="submit" className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-sm font-medium">
          Filter
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-left text-xs">
            <tr>
              <th className="px-4 py-2 font-medium">User</th>
              <th className="px-4 py-2 font-medium">Agency</th>
              <th className="px-4 py-2 text-right font-medium">Listings</th>
              <th className="px-4 py-2 text-right font-medium">Role &amp; status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <div className="font-medium">
                    {`${u.firstName} ${u.lastName}`.trim() || "—"}
                  </div>
                  <div className="text-muted-foreground text-xs">{u.email ?? "no email"}</div>
                </td>
                <td className="text-muted-foreground px-4 py-3">{u.businessName ?? "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums">{u.listingCount}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <UserActions user={u} self={u.id === me.id} />
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="text-muted-foreground px-4 py-8 text-center">
                  No users match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <p className="text-muted-foreground mt-3 text-center text-xs">
          Page {page} of {totalPages}
        </p>
      )}
    </div>
  );
}
