"use client";

import { useState, useTransition } from "react";
import { suspendListingAction, reinstateListingAction } from "@/server/actions/moderation";

/**
 * Row actions for the moderation queue. Suspend requires a typed reason (shown
 * to the agent + audit-logged); reinstate is a single confirm. Both call
 * admin-only server actions and revalidate the queue.
 */
export function ModerationActions({
  listingId,
  suspended,
}: {
  listingId: string;
  suspended: boolean;
}) {
  const [reason, setReason] = useState("");
  const [showReason, setShowReason] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (suspended) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await reinstateListingAction(listingId);
              if (r.error) setError(r.error);
            })
          }
          className="rounded-full border border-green-300 px-3 py-1.5 text-[13px] font-semibold text-green-700 transition-colors hover:bg-green-50 disabled:opacity-60"
        >
          {pending ? "Reinstating…" : "Reinstate"}
        </button>
        {error && <span className="text-[12px] text-red-700">{error}</span>}
      </div>
    );
  }

  if (!showReason) {
    return (
      <button
        type="button"
        onClick={() => setShowReason(true)}
        className="rounded-full border border-red-300 px-3 py-1.5 text-[13px] font-semibold text-red-700 transition-colors hover:bg-red-50"
      >
        Suspend
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (shown to agent)"
        aria-label="Suspension reason"
        className="w-56 rounded-lg border border-input bg-background px-3 py-1.5 text-[13px] outline-none focus:border-ring"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending || !reason.trim()}
          onClick={() =>
            start(async () => {
              const r = await suspendListingAction(listingId, reason);
              if (r.error) setError(r.error);
              else setShowReason(false);
            })
          }
          className="rounded-full bg-red-600 px-3 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
        >
          {pending ? "Suspending…" : "Confirm suspend"}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowReason(false);
            setError(null);
          }}
          className="text-muted-foreground text-[13px] hover:underline"
        >
          Cancel
        </button>
      </div>
      {error && <span className="text-[12px] text-red-700">{error}</span>}
    </div>
  );
}
