"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { importListingsAction, type ImportResult } from "@/server/actions/import-listings";

const TEMPLATE =
  "title,type,tenure,description,priceAmount,priceCurrency,rentPeriod,bedrooms,bathrooms,areaSqft,address,city,region,postalCode,country,latitude,longitude,images";

export function ImportForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onSubmit = () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setResult({ ok: false, error: "Choose a CSV file first." });
      return;
    }
    startTransition(async () => {
      const csv = await file.text();
      const r = await importListingsAction(csv);
      setResult(r);
      if (r.ok) router.refresh();
    });
  };

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div className="rounded-lg border p-4">
        <p className="text-sm font-medium">CSV format</p>
        <p className="text-muted-foreground mt-1 text-xs">
          First row must be a header. Columns (extras ignored):
        </p>
        <code className="text-muted-foreground mt-2 block overflow-x-auto rounded bg-muted/50 p-2 text-[11px]">
          {TEMPLATE}
        </code>
        <p className="text-muted-foreground mt-2 text-xs">
          <code>images</code> is a <code>;</code>-separated list of URLs. Rows import as drafts;
          missing coordinates are geocoded from the address. Duplicates (same title + city) are
          skipped.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          className="text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-sm"
        />
        <Button onClick={onSubmit} disabled={pending}>
          {pending ? "Importing…" : "Import"}
        </Button>
      </div>
      {fileName ? <p className="text-muted-foreground text-xs">Selected: {fileName}</p> : null}

      {result?.error ? (
        <p role="alert" className="border-destructive/40 text-destructive rounded-md border px-3 py-2 text-sm">
          {result.error}
        </p>
      ) : null}

      {result?.ok && result.summary ? (
        <div className="rounded-lg border p-4 text-sm">
          <p className="font-medium">
            Imported {result.summary.created} of {result.summary.total} rows
            {result.summary.skipped > 0 ? ` · ${result.summary.skipped} skipped (duplicates)` : ""}
          </p>
          {result.summary.errors.length > 0 ? (
            <div className="mt-3">
              <p className="text-destructive text-xs font-medium">
                {result.summary.errors.length} row(s) had errors:
              </p>
              <ul className="text-muted-foreground mt-1 list-inside list-disc text-xs">
                {result.summary.errors.slice(0, 10).map((e) => (
                  <li key={e.row}>
                    Row {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
