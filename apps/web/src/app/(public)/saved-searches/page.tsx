import Link from "next/link";
import { getSavedSearches } from "@/server/saved-searches";
import { SavedSearchRow } from "./saved-search-row";

export const metadata = { title: "Saved searches · homes" };
export const dynamic = "force-dynamic";

export default async function SavedSearchesPage() {
  const searches = await getSavedSearches();

  return (
    <div className="mx-auto w-full max-w-[720px] px-6 py-8">
      <h1 className="text-hof mb-1 text-[26px] font-bold tracking-[-0.02em]">Saved searches</h1>
      <p className="text-foggy mb-8 text-[15px]">
        We’ll email you when new homes match. Toggle alerts per search.
      </p>

      {searches.length === 0 ? (
        <div className="border-bebe rounded-card flex flex-col items-center gap-3 border border-dashed py-20 text-center">
          <p className="text-foggy text-[16px]">No saved searches yet.</p>
          <Link
            href="/search"
            className="bg-rausch rounded-full px-5 py-2.5 text-[14px] font-semibold text-white hover:opacity-90"
          >
            Start a search
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {searches.map((s) => (
            <SavedSearchRow key={s.id} search={s} />
          ))}
        </div>
      )}
    </div>
  );
}
