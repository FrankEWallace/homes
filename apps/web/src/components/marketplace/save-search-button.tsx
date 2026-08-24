"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, Check } from "lucide-react";
import { createSavedSearchAction } from "@/server/actions/saved-searches";
import type { SavedSearchCriteria } from "@/server/saved-searches";

/** Captures the current search URL params and persists them as a saved search. */
export function SaveSearchButton() {
  const params = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSave = () => {
    setError(null);
    const num = (k: string) => {
      const v = params.get(k);
      const n = v == null ? NaN : Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    const tenure = params.get("tenure");
    const criteria: SavedSearchCriteria = {
      q: params.get("q") ?? undefined,
      tenure: tenure === "sale" || tenure === "rent" ? tenure : undefined,
      city: params.get("city") ?? undefined,
      type: params.get("type") ?? undefined,
      priceMin: num("priceMin"),
      priceMax: num("priceMax"),
      minBeds: num("minBeds"),
      minBaths: num("minBaths"),
    };

    startTransition(async () => {
      const result = await createSavedSearchAction(criteria);
      if (result.authRequired) {
        router.push(`/login?next=${encodeURIComponent(`/search?${params.toString()}`)}`);
        return;
      }
      if (!result.ok) {
        setError(result.error ?? "Could not save");
        return;
      }
      setSaved(true);
    });
  };

  if (saved) {
    return (
      <span className="text-hof inline-flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-semibold">
        <Check className="size-4" /> Search saved
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onSave}
      disabled={pending}
      title={error ?? undefined}
      className="border-bebe text-hof hover:border-hof inline-flex h-10 items-center gap-2 rounded-full border bg-white px-4 text-[14px] font-semibold transition-colors disabled:opacity-60"
    >
      <Bell className="size-4" />
      {pending ? "Saving…" : error ? "Try again" : "Save search"}
    </button>
  );
}
