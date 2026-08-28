"use client";

import { useState, useTransition } from "react";
import { Trash2, Plus } from "lucide-react";
import type { AdminCity, AdminListingType } from "@/server/admin";
import {
  createCityAction,
  updateCityAction,
  deleteCityAction,
  createListingTypeAction,
  deleteListingTypeAction,
} from "@/server/actions/admin";

const inputCls =
  "rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-ring";

export function TaxonomyManager({
  cities,
  types,
}: {
  cities: AdminCity[];
  types: AdminListingType[];
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <CitiesPanel cities={cities} />
      <TypesPanel types={types} />
    </div>
  );
}

function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ error?: string; ok?: boolean }>, onOk?: () => void) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (r.error) setError(r.error);
      else onOk?.();
    });
  return { pending, error, run };
}

function CitiesPanel({ cities }: { cities: AdminCity[] }) {
  const [name, setName] = useState("");
  const { pending, error, run } = useAction();

  return (
    <section className="rounded-xl border p-5">
      <h2 className="text-lg font-semibold">Cities</h2>
      <p className="text-muted-foreground mt-0.5 text-sm">
        Drive the <code>/homes/[city]</code> landing pages. Inactive cities are hidden.
      </p>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => createCityAction({ name }), () => setName(""));
        }}
      >
        <input
          className={`${inputCls} flex-1`}
          placeholder="Add a city (e.g. Tanga)"
          aria-label="New city name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="bg-primary text-primary-foreground inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-60"
        >
          <Plus className="size-4" /> Add
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <ul className="mt-4 divide-y">
        {cities.map((c) => (
          <CityRow key={c.id} city={c} />
        ))}
        {cities.length === 0 && <li className="text-muted-foreground py-4 text-sm">No cities yet.</li>}
      </ul>
    </section>
  );
}

function CityRow({ city }: { city: AdminCity }) {
  const { pending, error, run } = useAction();
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <span className="text-sm font-medium">{city.name}</span>
        <span className="text-muted-foreground ml-2 text-xs">/{city.slug}</span>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={city.isActive}
            disabled={pending}
            onChange={(e) => run(() => updateCityAction(city.id, { isActive: e.target.checked }))}
          />
          Active
        </label>
        <button
          type="button"
          aria-label={`Delete ${city.name}`}
          disabled={pending}
          onClick={() => {
            if (confirm(`Delete ${city.name}? Its landing page will stop working.`))
              run(() => deleteCityAction(city.id));
          }}
          className="text-muted-foreground hover:text-red-600 disabled:opacity-50"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </li>
  );
}

function TypesPanel({ types }: { types: AdminListingType[] }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const { pending, error, run } = useAction();

  return (
    <section className="rounded-xl border p-5">
      <h2 className="text-lg font-semibold">Property types</h2>
      <p className="text-muted-foreground mt-0.5 text-sm">
        The property categories agents pick from. Types in use can&apos;t be deleted.
      </p>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => createListingTypeAction({ name, description: desc || undefined }), () => {
            setName("");
            setDesc("");
          });
        }}
      >
        <input
          className={`${inputCls} w-32`}
          placeholder="e.g. villa"
          aria-label="New property type name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={`${inputCls} flex-1`}
          placeholder="Description (optional)"
          aria-label="New property type description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="bg-primary text-primary-foreground inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-60"
        >
          <Plus className="size-4" /> Add
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <ul className="mt-4 divide-y">
        {types.map((t) => (
          <TypeRow key={t.id} type={t} />
        ))}
        {types.length === 0 && <li className="text-muted-foreground py-4 text-sm">No types yet.</li>}
      </ul>
    </section>
  );
}

function TypeRow({ type }: { type: AdminListingType }) {
  const { pending, error, run } = useAction();
  const inUse = type.listingCount > 0;
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <span className="text-sm font-medium capitalize">{type.name}</span>
        <span className="text-muted-foreground ml-2 text-xs">
          {type.listingCount} listing{type.listingCount === 1 ? "" : "s"}
        </span>
        {type.description && <p className="text-muted-foreground text-xs">{type.description}</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
      <button
        type="button"
        aria-label={`Delete ${type.name}`}
        disabled={pending || inUse}
        title={inUse ? "In use — reassign its listings first" : "Delete"}
        onClick={() => run(() => deleteListingTypeAction(type.id))}
        className="text-muted-foreground hover:text-red-600 disabled:opacity-40"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}
