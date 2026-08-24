import Link from "next/link";
import { Search } from "lucide-react";

export default function HomePage() {
  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col items-center px-6 py-24 text-center md:px-10 md:py-32">
      <h1 className="text-hof max-w-3xl text-[28px] font-bold tracking-[-0.02em] text-balance sm:text-[40px]">
        Find your next home
      </h1>
      <p className="text-foggy mt-3 max-w-xl text-[16px]">
        Search homes for sale and rent across the country.
      </p>

      {/* Search capsule — the hero */}
      <form
        action="/search"
        className="shadow-capsule mt-10 flex w-full max-w-[780px] items-center rounded-full bg-white p-2"
      >
        <label className="flex flex-1 flex-col px-5 py-1 text-left">
          <span className="text-hof text-[13px] font-semibold">Where</span>
          <input
            name="q"
            type="search"
            placeholder="City, neighborhood, or ZIP"
            aria-label="Search location"
            className="text-hof placeholder:text-foggy mt-0.5 w-full bg-transparent text-[14px] outline-none"
          />
        </label>

        <div className="bg-bebe h-8 w-px" aria-hidden />

        <label className="flex flex-col px-5 py-1 text-left">
          <span className="text-hof text-[13px] font-semibold">Type</span>
          <select
            name="tenure"
            aria-label="Buy or rent"
            className="text-hof mt-0.5 cursor-pointer bg-transparent text-[14px] outline-none"
            defaultValue=""
          >
            <option value="">Any</option>
            <option value="sale">Buy</option>
            <option value="rent">Rent</option>
          </select>
        </label>

        <button
          type="submit"
          aria-label="Search"
          className="bg-rausch hover:bg-rausch-600 ml-1 grid size-12 shrink-0 place-items-center rounded-full text-white transition-colors"
        >
          <Search className="size-5" />
        </button>
      </form>

      <div className="text-foggy mt-6 flex items-center gap-4 text-[14px]">
        <a href="/search?tenure=sale" className="hover:text-hof underline-offset-4 hover:underline">
          Browse homes for sale
        </a>
        <span aria-hidden>·</span>
        <a href="/search?tenure=rent" className="hover:text-hof underline-offset-4 hover:underline">
          Browse rentals
        </a>
      </div>

      {/* Popular cities — internal links to SEO landing pages */}
      <div className="mt-16 w-full max-w-[780px]">
        <p className="text-foggy mb-3 text-[13px] font-semibold tracking-wide uppercase">Popular cities</p>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { name: "San Francisco", slug: "san-francisco" },
            { name: "Austin", slug: "austin" },
            { name: "New York", slug: "new-york" },
            { name: "Seattle", slug: "seattle" },
            { name: "Miami", slug: "miami" },
          ].map((c) => (
            <Link
              key={c.slug}
              href={`/homes/${c.slug}`}
              className="border-bebe text-hof hover:border-hof rounded-full border bg-white px-4 py-2 text-[14px] font-medium transition-colors"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
