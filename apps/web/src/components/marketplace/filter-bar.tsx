"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const selectCls =
  "border-bebe text-hof hover:border-hof h-10 cursor-pointer rounded-full border bg-white px-4 text-[14px] font-medium outline-none transition-colors";

export function FilterBar() {
  const router = useRouter();
  const params = useSearchParams();

  const update = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      next.delete("page"); // any filter change resets to page 1
      router.push(`/search?${next.toString()}`);
    },
    [params, router],
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = new FormData(e.currentTarget).get("q");
          update({ q: typeof q === "string" ? q : null });
        }}
        className="border-bebe focus-within:border-hof flex h-10 items-center rounded-full border bg-white pl-4 transition-colors"
      >
        <input
          name="q"
          type="search"
          defaultValue={params.get("q") ?? ""}
          placeholder="City or area"
          aria-label="Search location"
          className="text-hof placeholder:text-foggy w-40 bg-transparent text-[14px] outline-none"
        />
      </form>

      <select
        aria-label="Buy or rent"
        className={selectCls}
        value={params.get("tenure") ?? ""}
        onChange={(e) => update({ tenure: e.target.value || null })}
      >
        <option value="">Any type</option>
        <option value="sale">For sale</option>
        <option value="rent">For rent</option>
      </select>

      <select
        aria-label="Minimum bedrooms"
        className={selectCls}
        value={params.get("minBeds") ?? ""}
        onChange={(e) => update({ minBeds: e.target.value || null })}
      >
        <option value="">Beds</option>
        <option value="1">1+ bd</option>
        <option value="2">2+ bd</option>
        <option value="3">3+ bd</option>
        <option value="4">4+ bd</option>
      </select>

      <select
        aria-label="Maximum price"
        className={selectCls}
        value={params.get("priceMax") ?? ""}
        onChange={(e) => update({ priceMax: e.target.value || null })}
      >
        <option value="">Any price</option>
        <option value="1000000">≤ TSh 1M</option>
        <option value="5000000">≤ TSh 5M</option>
        <option value="50000000">≤ TSh 50M</option>
        <option value="200000000">≤ TSh 200M</option>
        <option value="500000000">≤ TSh 500M</option>
      </select>

      <select
        aria-label="Sort"
        className={`${selectCls} ml-auto`}
        value={params.get("sort") ?? "relevance"}
        onChange={(e) => update({ sort: e.target.value === "relevance" ? null : e.target.value })}
      >
        <option value="relevance">Sort: Relevance</option>
        <option value="price_asc">Price: Low to high</option>
        <option value="price_desc">Price: High to low</option>
        <option value="newest">Newest</option>
      </select>
    </div>
  );
}
