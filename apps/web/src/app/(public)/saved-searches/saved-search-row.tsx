"use client";

import Link from "next/link";
import { useTransition, useState } from "react";
import { Bell, BellOff, Trash2 } from "lucide-react";
import {
  deleteSavedSearchAction,
  toggleSavedSearchNotifyAction,
} from "@/server/actions/saved-searches";
import type { SavedSearch } from "@/server/saved-searches";

function toSearchHref(query: SavedSearch["query"]): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") usp.set(k, String(v));
  }
  return `/search?${usp.toString()}`;
}

export function SavedSearchRow({ search }: { search: SavedSearch }) {
  const [pending, startTransition] = useTransition();
  const [notify, setNotify] = useState(search.notify);
  const [removed, setRemoved] = useState(false);

  if (removed) return null;

  return (
    <div className="border-bebe flex items-center justify-between gap-4 rounded-2xl border bg-white p-4">
      <div className="min-w-0">
        <Link href={toSearchHref(search.query)} className="text-hof block truncate text-[15px] font-semibold hover:underline">
          {search.name}
        </Link>
        <p className="text-foggy mt-0.5 text-[13px]">
          {notify ? "Email alerts on" : "Alerts off"}
          {search.frequency === "daily" ? " · daily" : ""}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          disabled={pending}
          aria-pressed={notify}
          aria-label={notify ? "Turn off alerts" : "Turn on alerts"}
          onClick={() => {
            const next = !notify;
            setNotify(next); // optimistic
            startTransition(async () => {
              const r = await toggleSavedSearchNotifyAction(search.id, next);
              if (!r.ok) setNotify(!next);
            });
          }}
          className="text-hof hover:bg-faint grid size-9 place-items-center rounded-full transition-colors disabled:opacity-50"
        >
          {notify ? <Bell className="size-4" /> : <BellOff className="size-4" />}
        </button>
        <button
          type="button"
          disabled={pending}
          aria-label="Delete saved search"
          onClick={() => {
            startTransition(async () => {
              const r = await deleteSavedSearchAction(search.id);
              if (r.ok) setRemoved(true);
            });
          }}
          className="text-foggy hover:bg-faint hover:text-rausch grid size-9 place-items-center rounded-full transition-colors disabled:opacity-50"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}
