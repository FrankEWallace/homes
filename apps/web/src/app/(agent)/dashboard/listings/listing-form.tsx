"use client";

import Link from "next/link";
import { useActionState, useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import { saveListingAction, type ListingFormState } from "@/server/actions/listings";
import { uploadListingImagesAction } from "@/server/actions/upload-images";
import type { AgentListing } from "@/server/agent-listings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

function Field({
  label,
  htmlFor,
  error,
  children,
  hint,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}

export function ListingForm({
  types,
  listing,
}: {
  types: { name: string; slug: string }[];
  listing?: AgentListing;
}) {
  const [state, action, pending] = useActionState<ListingFormState, FormData>(saveListingAction, {});
  const [tenure, setTenure] = useState<"sale" | "rent">(listing?.tenure ?? "sale");
  const [images, setImages] = useState<string[]>(listing?.images ?? []);
  const [urlDraft, setUrlDraft] = useState("");
  const [uploading, startUpload] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fe = state.fieldErrors ?? {};

  const addUrl = () => {
    const u = urlDraft.trim();
    if (/^https?:\/\//.test(u) && !images.includes(u)) {
      setImages((prev) => [...prev, u]);
      setUrlDraft("");
    }
  };

  const onUpload = () => {
    setUploadError(null);
    const files = fileRef.current?.files;
    if (!listing || !files || files.length === 0) return;
    const fd = new FormData();
    for (const f of Array.from(files)) fd.append("images", f);
    startUpload(async () => {
      const r = await uploadListingImagesAction(listing.id, fd);
      if (!r.ok) setUploadError(r.error ?? "Upload failed");
      else if (r.images) setImages(r.images);
      if (fileRef.current) fileRef.current.value = "";
    });
  };

  return (
    <form action={action} className="flex max-w-3xl flex-col gap-6">
      {listing ? <input type="hidden" name="id" value={listing.id} /> : null}

      {state.error ? (
        <p role="alert" className="border-destructive/40 text-destructive rounded-md border px-3 py-2 text-sm">
          {state.error}
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Title" htmlFor="title" error={fe.title}>
            <Input id="title" name="title" defaultValue={listing?.title} required />
          </Field>
        </div>

        <Field label="Property type" htmlFor="type" error={fe.type}>
          <select
            id="type"
            name="type"
            defaultValue={listing?.type ?? ""}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm capitalize"
          >
            <option value="" disabled>
              Choose…
            </option>
            {types.map((t) => (
              <option key={t.slug} value={t.name} className="capitalize">
                {t.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Listing for" htmlFor="tenure" error={fe.tenure}>
          <select
            id="tenure"
            name="tenure"
            value={tenure}
            onChange={(e) => setTenure(e.target.value as "sale" | "rent")}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          >
            <option value="sale">For sale</option>
            <option value="rent">For rent</option>
          </select>
        </Field>

        <Field label="Price" htmlFor="priceAmount" error={fe.priceAmount}>
          <Input
            id="priceAmount"
            name="priceAmount"
            type="number"
            min="0"
            step="1000"
            defaultValue={listing?.priceAmount}
            required
          />
        </Field>

        {tenure === "rent" ? (
          <Field label="Rent period" htmlFor="rentPeriod" error={fe.rentPeriod}>
            <select
              id="rentPeriod"
              name="rentPeriod"
              defaultValue={listing?.rentPeriod ?? "month"}
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              <option value="week">per week</option>
              <option value="month">per month</option>
              <option value="year">per year</option>
            </select>
          </Field>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Field label="Bedrooms" htmlFor="bedrooms" error={fe.bedrooms}>
          <Input id="bedrooms" name="bedrooms" type="number" min="0" defaultValue={listing?.bedrooms ?? ""} />
        </Field>
        <Field label="Bathrooms" htmlFor="bathrooms" error={fe.bathrooms}>
          <Input id="bathrooms" name="bathrooms" type="number" min="0" step="0.5" defaultValue={listing?.bathrooms ?? ""} />
        </Field>
        <Field label="Area (sqft)" htmlFor="areaSqft" error={fe.areaSqft}>
          <Input id="areaSqft" name="areaSqft" type="number" min="0" defaultValue={listing?.areaSqft ?? ""} />
        </Field>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Address" htmlFor="address" error={fe.address}>
            <Input id="address" name="address" defaultValue={listing?.address ?? ""} />
          </Field>
        </div>
        <Field label="City" htmlFor="city" error={fe.city}>
          <Input id="city" name="city" defaultValue={listing?.city} required />
        </Field>
        <Field label="Region / state" htmlFor="region" error={fe.region}>
          <Input id="region" name="region" defaultValue={listing?.region ?? ""} />
        </Field>
        <Field label="Postal code" htmlFor="postalCode" error={fe.postalCode}>
          <Input id="postalCode" name="postalCode" defaultValue={listing?.postalCode ?? ""} />
        </Field>
        <Field
          label="Latitude"
          htmlFor="latitude"
          error={fe.latitude}
          hint="Needed to appear on the map"
        >
          <Input id="latitude" name="latitude" type="number" step="any" defaultValue={listing?.latitude ?? ""} />
        </Field>
        <Field label="Longitude" htmlFor="longitude" error={fe.longitude}>
          <Input id="longitude" name="longitude" type="number" step="any" defaultValue={listing?.longitude ?? ""} />
        </Field>
      </section>

      <Field label="Description" htmlFor="description" error={fe.description}>
        <Textarea id="description" name="description" rows={6} defaultValue={listing?.description} required />
      </Field>

      <div className="flex flex-col gap-2">
        <Label>Images</Label>
        {/* Submitted as newline-joined URLs — the action splits them back out. */}
        <input type="hidden" name="images" value={images.join("\n")} />

        {images.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {images.map((src) => (
              <div key={src} className="group relative size-20 overflow-hidden rounded-md border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() => setImages((prev) => prev.filter((u) => u !== src))}
                  className="bg-background/80 absolute right-0.5 top-0.5 grid size-5 place-items-center rounded-full border opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">No images yet.</p>
        )}
        {fe.images ? <p className="text-destructive text-xs">{fe.images}</p> : null}

        <div className="flex gap-2">
          <Input
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addUrl();
              }
            }}
            placeholder="Paste an image URL…"
          />
          <Button type="button" variant="outline" onClick={addUrl}>
            Add URL
          </Button>
        </div>

        {listing ? (
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" multiple className="text-sm" />
            <Button type="button" variant="outline" onClick={onUpload} disabled={uploading}>
              {uploading ? "Uploading…" : "Upload files"}
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">Save the draft first to upload image files.</p>
        )}
        {uploadError ? <p className="text-destructive text-xs">{uploadError}</p> : null}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : listing ? "Save changes" : "Create listing"}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/dashboard/listings">Cancel</Link>
        </Button>
        {!listing ? (
          <span className="text-muted-foreground text-xs">Saved as a draft — publish it from the list.</span>
        ) : null}
      </div>
    </form>
  );
}
