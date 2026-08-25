"use client";

import { useState, useTransition } from "react";
import { updateLeadStatusAction } from "@/server/actions/lead-status";
import type { LeadStatus } from "@/server/leads";

const OPTIONS: LeadStatus[] = ["new", "contacted", "qualified", "closed"];

export function LeadStatusSelect({ id, status }: { id: string; status: LeadStatus }) {
  const [value, setValue] = useState<LeadStatus>(status);
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={value}
      disabled={pending}
      aria-label="Lead status"
      onChange={(e) => {
        const next = e.target.value as LeadStatus;
        const prev = value;
        setValue(next); // optimistic
        startTransition(async () => {
          const r = await updateLeadStatusAction(id, next);
          if (!r.ok) setValue(prev);
        });
      }}
      className="bg-background h-8 rounded-md border px-2 text-sm capitalize outline-none disabled:opacity-50"
    >
      {OPTIONS.map((s) => (
        <option key={s} value={s} className="capitalize">
          {s}
        </option>
      ))}
    </select>
  );
}
