"use client";

import { useState, useTransition } from "react";
import type { AdminUser } from "@/server/admin";
import { updateUserAction } from "@/server/actions/admin";

const statusStyles: Record<AdminUser["status"], string> = {
  active: "bg-green-100 text-green-800",
  suspended: "bg-amber-100 text-amber-800",
  banned: "bg-red-100 text-red-800",
};

/**
 * Inline role + status controls for a user row. `self` locks the controls so an
 * admin can't lock themselves out (the backend also rejects self-updates).
 */
export function UserActions({ user, self }: { user: AdminUser; self: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const patch = (input: { status?: AdminUser["status"]; role?: AdminUser["role"] }) =>
    start(async () => {
      setError(null);
      const r = await updateUserAction(user.id, input);
      if (r.error) setError(r.error);
    });

  if (self) {
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[user.status]}`}>
        You
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <select
          aria-label={`Role for ${user.email ?? user.firstName}`}
          className="rounded-md border border-input bg-background px-2 py-1 text-xs"
          value={user.role}
          disabled={pending}
          onChange={(e) => patch({ role: e.target.value as AdminUser["role"] })}
        >
          <option value="seeker">seeker</option>
          <option value="agent">agent</option>
          <option value="admin">admin</option>
        </select>
        <select
          aria-label={`Status for ${user.email ?? user.firstName}`}
          className={`rounded-md border border-input px-2 py-1 text-xs font-medium ${statusStyles[user.status]}`}
          value={user.status}
          disabled={pending}
          onChange={(e) => patch({ status: e.target.value as AdminUser["status"] })}
        >
          <option value="active">active</option>
          <option value="suspended">suspended</option>
          <option value="banned">banned</option>
        </select>
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
